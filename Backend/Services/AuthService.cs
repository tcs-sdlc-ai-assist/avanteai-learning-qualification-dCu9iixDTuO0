using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(AppDbContext context, IConfiguration configuration, ILogger<AuthService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user is null)
        {
            _logger.LogWarning("Login attempt failed: user not found for email {Email}", request.Email);
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Login attempt failed: user {Email} is inactive", request.Email);
            throw new UnauthorizedAccessException("Account is inactive.");
        }

        if (!VerifyPassword(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Login attempt failed: invalid password for email {Email}", request.Email);
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        var token = GenerateJwtToken(user);
        var expiration = DateTime.UtcNow.AddMinutes(GetTokenExpirationMinutes());

        _logger.LogInformation("User {Email} logged in successfully", user.Email);

        return new LoginResponseDto
        {
            Token = token,
            Expiration = expiration,
            User = MapToUserInfo(user)
        };
    }

    public async Task<LoginResponseDto> RegisterAsync(RegisterRequestDto request)
    {
        var existingUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (existingUser is not null)
        {
            _logger.LogWarning("Registration attempt failed: email {Email} already exists", request.Email);
            throw new InvalidOperationException("A user with this email already exists.");
        }

        var role = UserRole.LearningManager;
        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            if (!Enum.TryParse<UserRole>(request.Role, ignoreCase: true, out var parsedRole))
            {
                throw new ArgumentException($"Invalid role: {request.Role}");
            }
            role = parsedRole;
        }

        var passwordHash = HashPassword(request.Password);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            PasswordHash = passwordHash,
            FullName = request.FullName,
            Role = role,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(user);
        var expiration = DateTime.UtcNow.AddMinutes(GetTokenExpirationMinutes());

        _logger.LogInformation("User {Email} registered successfully with role {Role}", user.Email, user.Role);

        return new LoginResponseDto
        {
            Token = token,
            Expiration = expiration,
            User = MapToUserInfo(user)
        };
    }

    public string GenerateJwtToken(User user)
    {
        var secretKey = _configuration["Jwt:SecretKey"]
            ?? _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT secret key is not configured.");

        var issuer = _configuration["Jwt:Issuer"] ?? "avante-ai-compliance";
        var audience = _configuration["Jwt:Audience"] ?? "avante-ai-compliance-client";
        var expirationMinutes = GetTokenExpirationMinutes();

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private int GetTokenExpirationMinutes()
    {
        var expirationStr = _configuration["Jwt:ExpirationInMinutes"];
        if (int.TryParse(expirationStr, out var minutes) && minutes > 0)
        {
            return minutes;
        }
        return 60;
    }

    private static string HashPassword(string password)
    {
        return BCryptHash(password);
    }

    private static bool VerifyPassword(string password, string passwordHash)
    {
        return BCryptVerify(password, passwordHash);
    }

    /// <summary>
    /// Hashes a password using a PBKDF2-based approach compatible with the seed data format.
    /// Uses the same approach as ASP.NET Core Identity's PasswordHasher.
    /// </summary>
    private static string BCryptHash(string password)
    {
        using var deriveBytes = new System.Security.Cryptography.Rfc2898DeriveBytes(
            password,
            saltSize: 16,
            iterations: 100000,
            System.Security.Cryptography.HashAlgorithmName.SHA256);

        var salt = deriveBytes.Salt;
        var hash = deriveBytes.GetBytes(32);

        var output = new byte[1 + 16 + 32];
        output[0] = 0x01; // version marker
        Buffer.BlockCopy(salt, 0, output, 1, 16);
        Buffer.BlockCopy(hash, 0, output, 17, 32);

        return Convert.ToBase64String(output);
    }

    /// <summary>
    /// Verifies a password against a stored hash.
    /// Supports the PBKDF2-based format used by this service and the seed data format.
    /// </summary>
    private static bool BCryptVerify(string password, string storedHash)
    {
        byte[] decoded;
        try
        {
            decoded = Convert.FromBase64String(storedHash);
        }
        catch (FormatException)
        {
            return false;
        }

        if (decoded.Length < 49)
        {
            return false;
        }

        var salt = new byte[16];
        Buffer.BlockCopy(decoded, 1, salt, 0, 16);

        var storedSubkey = new byte[32];
        Buffer.BlockCopy(decoded, 17, storedSubkey, 0, 32);

        using var deriveBytes = new System.Security.Cryptography.Rfc2898DeriveBytes(
            password,
            salt,
            iterations: 100000,
            System.Security.Cryptography.HashAlgorithmName.SHA256);

        var computedHash = deriveBytes.GetBytes(32);

        return System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(computedHash, storedSubkey);
    }

    private static UserInfoDto MapToUserInfo(User user)
    {
        return new UserInfoDto
        {
            Id = user.Id.ToString(),
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString()
        };
    }
}