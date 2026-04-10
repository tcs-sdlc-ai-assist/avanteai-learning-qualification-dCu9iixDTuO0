using System.Text;
using Backend.Data;
using Backend.Services;
using Avante.Backend.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── Configuration ─────────────────────────────────────────────────────────────

var configuration = builder.Configuration;
var connectionString = configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

var jwtSecretKey = configuration["Jwt:SecretKey"]
    ?? configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT secret key is not configured.");

var jwtIssuer = configuration["Jwt:Issuer"] ?? "avante-ai-compliance";
var jwtAudience = configuration["Jwt:Audience"] ?? "avante-ai-compliance-client";

var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "http://localhost:3000"];

// ── Database ──────────────────────────────────────────────────────────────────

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// ── Authentication ────────────────────────────────────────────────────────────

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        ClockSkew = TimeSpan.FromMinutes(1)
    };

    // Allow SignalR to receive the JWT token from the query string
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ── SignalR ───────────────────────────────────────────────────────────────────

builder.Services.AddSignalR(options =>
{
    var signalRConfig = configuration.GetSection("SignalR");
    options.EnableDetailedErrors = signalRConfig.GetValue<bool>("EnableDetailedErrors", builder.Environment.IsDevelopment());
    options.KeepAliveInterval = TimeSpan.FromSeconds(signalRConfig.GetValue<int>("KeepAliveInterval", 15));
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(signalRConfig.GetValue<int>("ClientTimeoutInterval", 30));
    options.MaximumReceiveMessageSize = signalRConfig.GetValue<long>("MaximumReceiveMessageSize", 65536);
});

// ── Caching ───────────────────────────────────────────────────────────────────

builder.Services.AddMemoryCache();

// ── Application Services ──────────────────────────────────────────────────────

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IProgramService, ProgramService>();
builder.Services.AddScoped<IPolicyService, PolicyService>();
builder.Services.AddScoped<IEvidenceService, EvidenceService>();
builder.Services.AddScoped<IExceptionService, ExceptionService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IExportService, ExportService>();
builder.Services.AddScoped<ISimulatedAIValidator, SimulatedAIValidator>();
builder.Services.AddScoped<PolicyVersionFactory>();

// ── Controllers & Swagger ─────────────────────────────────────────────────────

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Avante AI Compliance API",
        Version = "v1",
        Description = "API for the Avante AI Compliance platform."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token. Example: eyJhbGciOiJIUzI1NiIs..."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ── Build App ─────────────────────────────────────────────────────────────────

var app = builder.Build();

// ── Database Migration & Seeding ──────────────────────────────────────────────

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        if (app.Environment.IsDevelopment())
        {
            logger.LogInformation("Applying database migrations...");
            await dbContext.Database.MigrateAsync();
            logger.LogInformation("Database migrations applied successfully.");
        }
        else
        {
            logger.LogInformation("Ensuring database is created...");
            await dbContext.Database.EnsureCreatedAsync();
            logger.LogInformation("Database ready.");
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Database migration/creation failed. Attempting EnsureCreated as fallback...");
        try
        {
            await dbContext.Database.EnsureCreatedAsync();
            logger.LogInformation("Database created via EnsureCreated fallback.");
        }
        catch (Exception fallbackEx)
        {
            logger.LogError(fallbackEx, "Failed to initialize database.");
        }
    }
}

// ── Middleware Pipeline ───────────────────────────────────────────────────────

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Avante AI Compliance API v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

// ── Health Check Endpoint ─────────────────────────────────────────────────────

app.MapGet("/health", () => Results.Ok(new { Status = "Healthy", Timestamp = DateTimeOffset.UtcNow }))
    .AllowAnonymous();

app.Run();