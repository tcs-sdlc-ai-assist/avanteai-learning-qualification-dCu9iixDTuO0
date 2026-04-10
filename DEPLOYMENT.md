# Deployment Guide — Avante AI Compliance

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [Backend Deployment](#backend-deployment)
  - [Azure App Service](#azure-app-service)
  - [Docker](#docker)
- [Database Setup (PostgreSQL)](#database-setup-postgresql)
- [EF Core Migrations](#ef-core-migrations)
- [Environment Variables](#environment-variables)
  - [Frontend Environment Variables](#frontend-environment-variables)
  - [Backend Environment Variables](#backend-environment-variables)
- [CORS Configuration](#cors-configuration)
- [SignalR Scaling Considerations](#signalr-scaling-considerations)
- [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌──────────────────┐       HTTPS        ┌──────────────────────┐       TCP        ┌──────────────┐
│  React Frontend  │  ───────────────►  │  ASP.NET Core 9 API  │  ─────────────►  │  PostgreSQL   │
│  (Vercel CDN)    │                    │  (Azure / Docker)    │                   │  Database     │
└──────────────────┘                    └──────────────────────┘                   └──────────────┘
                                                │
                                                │ WebSocket (SignalR)
                                                ▼
                                        Real-time Notifications
```

---

## Frontend Deployment (Vercel)

### Prerequisites

- Vercel account linked to your Git repository
- Node.js 18+ for local builds

### vercel.json Configuration

Create a `vercel.json` file in the frontend project root to enable SPA routing:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### Vercel Deployment Steps

1. **Connect Repository**: Link your GitHub/GitLab repository in the Vercel dashboard.

2. **Configure Project Settings**:
   - **Root Directory**: Set to the frontend project folder (e.g., `frontend/`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Set Environment Variables**: In the Vercel dashboard under **Settings → Environment Variables**, add all `VITE_*` variables (see [Frontend Environment Variables](#frontend-environment-variables)).

4. **Deploy**: Push to the configured branch (e.g., `main`) to trigger automatic deployment.

5. **Custom Domain** (optional): Add your domain under **Settings → Domains** and configure DNS records as instructed by Vercel.

### Local Build Verification

```bash
cd frontend
npm install
npm run build
npx vite preview
```

---

## Backend Deployment

### Azure App Service

#### Prerequisites

- Azure CLI installed and authenticated
- Azure subscription with an App Service Plan (B1 or higher recommended)

#### Step-by-Step

1. **Create Resources**:

```bash
# Create resource group
az group create --name rg-avante-compliance --location eastus

# Create App Service Plan (Linux)
az appservice plan create \
  --name plan-avante-compliance \
  --resource-group rg-avante-compliance \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --name avante-compliance-api \
  --resource-group rg-avante-compliance \
  --plan plan-avante-compliance \
  --runtime "DOTNETCORE:9.0"
```

2. **Configure Application Settings**:

```bash
az webapp config appsettings set \
  --name avante-compliance-api \
  --resource-group rg-avante-compliance \
  --settings \
    ConnectionStrings__DefaultConnection="Host=your-server.postgres.database.azure.com;Database=avante_compliance;Username=adminuser;Password=YourSecurePassword;SSL Mode=Require" \
    ASPNETCORE_ENVIRONMENT="Production" \
    Jwt__Key="your-256-bit-secret-key" \
    Jwt__Issuer="avante-compliance-api" \
    Jwt__Audience="avante-compliance-client" \
    AllowedOrigins__0="https://your-frontend.vercel.app"
```

3. **Enable WebSockets** (required for SignalR):

```bash
az webapp config set \
  --name avante-compliance-api \
  --resource-group rg-avante-compliance \
  --web-sockets-enabled true
```

4. **Deploy via ZIP**:

```bash
cd backend
dotnet publish -c Release -o ./publish
cd publish
zip -r ../deploy.zip .
az webapp deploy \
  --name avante-compliance-api \
  --resource-group rg-avante-compliance \
  --src-path ../deploy.zip \
  --type zip
```

5. **Enable Logging**:

```bash
az webapp log config \
  --name avante-compliance-api \
  --resource-group rg-avante-compliance \
  --application-logging filesystem \
  --level information

# Stream logs
az webapp log tail \
  --name avante-compliance-api \
  --resource-group rg-avante-compliance
```

### Docker

#### Dockerfile

Create a `Dockerfile` in the backend project root:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["AvanteAiCompliance.csproj", "."]
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "AvanteAiCompliance.dll"]
```

#### Docker Compose (with PostgreSQL)

```yaml
version: "3.8"

services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - ConnectionStrings__DefaultConnection=Host=db;Database=avante_compliance;Username=postgres;Password=postgres_password
      - ASPNETCORE_ENVIRONMENT=Production
      - Jwt__Key=your-256-bit-secret-key-minimum-32-chars
      - Jwt__Issuer=avante-compliance-api
      - Jwt__Audience=avante-compliance-client
      - AllowedOrigins__0=https://your-frontend.vercel.app
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: avante_compliance
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
```

#### Build and Run

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f api

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes database data)
docker compose down -v
```

---

## Database Setup (PostgreSQL)

### Azure Database for PostgreSQL

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --name avante-compliance-db \
  --resource-group rg-avante-compliance \
  --location eastus \
  --admin-user adminuser \
  --admin-password YourSecurePassword123! \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16

# Allow Azure services to connect
az postgres flexible-server firewall-rule create \
  --name avante-compliance-db \
  --resource-group rg-avante-compliance \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Create the database
az postgres flexible-server db create \
  --server-name avante-compliance-db \
  --resource-group rg-avante-compliance \
  --database-name avante_compliance
```

### Connection String Format

```
Host=avante-compliance-db.postgres.database.azure.com;Database=avante_compliance;Username=adminuser;Password=YourSecurePassword123!;SSL Mode=Require;Trust Server Certificate=true
```

### Local Development (PostgreSQL via Docker)

```bash
docker run -d \
  --name avante-postgres \
  -e POSTGRES_DB=avante_compliance \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=devpassword \
  -p 5432:5432 \
  postgres:16-alpine
```

Local connection string:
```
Host=localhost;Database=avante_compliance;Username=postgres;Password=devpassword
```

---

## EF Core Migrations

### Prerequisites

Install the EF Core CLI tools globally:

```bash
dotnet tool install --global dotnet-ef
```

### Common Commands

```bash
# Navigate to the backend project directory
cd backend

# Create a new migration
dotnet ef migrations add InitialCreate

# Create a migration with a descriptive name
dotnet ef migrations add AddComplianceAuditTable

# Apply all pending migrations to the database
dotnet ef database update

# Apply migrations up to a specific migration
dotnet ef database update InitialCreate

# Revert the last migration (if not yet applied to DB)
dotnet ef migrations remove

# Revert database to a specific migration
dotnet ef database update PreviousMigrationName

# Generate a SQL script for all migrations (useful for production)
dotnet ef migrations script --idempotent -o migrations.sql

# Generate a SQL script between two migrations
dotnet ef migrations script FromMigration ToMigration -o migration-update.sql

# List all migrations and their status
dotnet ef migrations list
```

### Production Migration Strategy

**Never run `dotnet ef database update` directly against production.** Instead:

1. Generate an idempotent SQL script:
   ```bash
   dotnet ef migrations script --idempotent -o migrations.sql
   ```

2. Review the generated SQL script.

3. Apply the script through your database management tool or CI/CD pipeline:
   ```bash
   psql -h your-server.postgres.database.azure.com \
        -U adminuser \
        -d avante_compliance \
        -f migrations.sql
   ```

### Applying Migrations at Startup (Development Only)

In `Program.cs`, for development environments only:

```csharp
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}
```

---

## Environment Variables

### Frontend Environment Variables

All frontend environment variables **must** be prefixed with `VITE_` to be accessible via `import.meta.env`.

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `https://avante-compliance-api.azurewebsites.net` |
| `VITE_SIGNALR_HUB_URL` | SignalR hub endpoint | `https://avante-compliance-api.azurewebsites.net/hubs/notifications` |
| `VITE_APP_TITLE` | Application display title | `Avante AI Compliance` |

Create a `.env` file in the frontend root for local development:

```env
VITE_API_BASE_URL=https://localhost:5001
VITE_SIGNALR_HUB_URL=https://localhost:5001/hubs/notifications
VITE_APP_TITLE=Avante AI Compliance (Dev)
```

> **Important**: Never commit `.env` files to version control. Ensure `.env` is listed in `.gitignore`.

### Backend Environment Variables

Backend configuration uses the standard ASP.NET Core configuration hierarchy: `appsettings.json` → `appsettings.{Environment}.json` → Environment Variables → User Secrets (dev only).

| Variable | Description | Example |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | Runtime environment | `Development`, `Staging`, `Production` |
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string | See [Connection String Format](#connection-string-format) |
| `Jwt__Key` | JWT signing key (min 32 characters) | `your-256-bit-secret-key-at-least-32-chars` |
| `Jwt__Issuer` | JWT token issuer | `avante-compliance-api` |
| `Jwt__Audience` | JWT token audience | `avante-compliance-client` |
| `Jwt__ExpirationInMinutes` | Token expiration time | `60` |
| `AllowedOrigins__0` | First allowed CORS origin | `https://your-frontend.vercel.app` |
| `AllowedOrigins__1` | Second allowed CORS origin (optional) | `https://custom-domain.com` |
| `Logging__LogLevel__Default` | Default log level | `Information` |

For local development, use **User Secrets** to avoid committing sensitive values:

```bash
cd backend
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "your-local-dev-secret-key-at-least-32-chars"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Database=avante_compliance;Username=postgres;Password=devpassword"
```

---

## CORS Configuration

CORS must be configured in the backend to allow the frontend origin. In `Program.cs`:

```csharp
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Required for SignalR
    });
});

// ... after building the app:

app.UseCors(); // Must be called before MapControllers and MapHub
```

### Key Points

- **`AllowCredentials()`** is **required** for SignalR WebSocket connections. When using `AllowCredentials()`, you **cannot** use `AllowAnyOrigin()` — you must specify explicit origins with `WithOrigins()`.
- In production, always specify exact origins. Never use wildcard (`*`) origins with credentials.
- The `AllowedOrigins` configuration supports multiple origins via array indexing (`AllowedOrigins__0`, `AllowedOrigins__1`, etc.).

### Example `appsettings.Production.json`

```json
{
  "AllowedOrigins": [
    "https://your-frontend.vercel.app",
    "https://custom-domain.com"
  ]
}
```

### Example `appsettings.Development.json`

```json
{
  "AllowedOrigins": [
    "http://localhost:5173",
    "http://localhost:3000"
  ]
}
```

---

## SignalR Scaling Considerations

### Single Instance

For a single server instance, SignalR works out of the box with no additional configuration. WebSocket connections are maintained in-memory.

### Multiple Instances (Scale-Out)

When running multiple backend instances (e.g., Azure App Service with multiple instances, Kubernetes pods, or load-balanced Docker containers), SignalR requires a **backplane** to broadcast messages across all instances.

#### Azure SignalR Service (Recommended for Azure)

1. **Create Azure SignalR Service**:

```bash
az signalr create \
  --name avante-compliance-signalr \
  --resource-group rg-avante-compliance \
  --sku Standard_S1 \
  --unit-count 1 \
  --service-mode Default
```

2. **Get Connection String**:

```bash
az signalr key list \
  --name avante-compliance-signalr \
  --resource-group rg-avante-compliance \
  --query primaryConnectionString -o tsv
```

3. **Configure in Backend**:

```csharp
builder.Services.AddSignalR().AddAzureSignalR(connectionString);
```

4. **Add Environment Variable**:

```
Azure__SignalR__ConnectionString=Endpoint=https://avante-compliance-signalr.service.signalr.net;AccessKey=...;Version=1.0;
```

#### Redis Backplane (For Docker / Self-Hosted)

1. **Add NuGet Package**:

```bash
dotnet add package Microsoft.AspNetCore.SignalR.StackExchangeRedis
```

2. **Configure in Backend**:

```csharp
builder.Services.AddSignalR().AddStackExchangeRedis(redisConnectionString, options =>
{
    options.Configuration.ChannelPrefix = RedisChannel.Literal("AvanteCompliance");
});
```

3. **Add Redis to Docker Compose**:

```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
```

### Sticky Sessions

If you cannot use a backplane, configure **sticky sessions** (session affinity) on your load balancer so that each client always connects to the same backend instance. This is a workaround, not a long-term solution.

- **Azure App Service**: Enable ARR Affinity in **Settings → Configuration → General Settings**
- **Nginx**: Use `ip_hash` directive in the upstream block

### WebSocket Transport

Ensure your infrastructure supports WebSocket connections:

- **Azure App Service**: Enable WebSockets in **Settings → Configuration → General Settings**
- **Nginx**: Add WebSocket proxy headers:
  ```nginx
  location /hubs/ {
      proxy_pass http://backend;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
  }
  ```
- **Cloudflare**: WebSockets are supported on all plans, but ensure the toggle is enabled in the dashboard.

---

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  DOTNET_VERSION: "9.0.x"
  NODE_VERSION: "18"

jobs:
  build-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend

    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Restore dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --configuration Release --no-restore

      - name: Run tests
        run: dotnet test --configuration Release --no-build --verbosity normal

      - name: Publish
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: dotnet publish --configuration Release --output ./publish

      - name: Upload artifact
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        uses: actions/upload-artifact@v4
        with:
          name: backend-publish
          path: ./backend/publish

  build-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
          cache-dependency-path: ./frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
        env:
          VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}
          VITE_SIGNALR_HUB_URL: ${{ vars.VITE_SIGNALR_HUB_URL }}

  deploy-backend:
    needs: [build-backend, build-frontend]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest

    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: backend-publish
          path: ./publish

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name: avante-compliance-api
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: ./publish
```

### Required GitHub Secrets and Variables

| Type | Name | Description |
|---|---|---|
| Secret | `AZURE_WEBAPP_PUBLISH_PROFILE` | Azure App Service publish profile XML |
| Variable | `VITE_API_BASE_URL` | Production API URL |
| Variable | `VITE_SIGNALR_HUB_URL` | Production SignalR hub URL |

### Vercel Auto-Deploy

Vercel automatically deploys on push to the connected branch. No additional CI/CD configuration is needed for the frontend if using Vercel's Git integration. Environment variables are managed in the Vercel dashboard.

---

## Troubleshooting

### Common Issues

#### Frontend returns 404 on page refresh

- **Cause**: SPA routes are not being rewritten to `index.html`.
- **Fix**: Ensure `vercel.json` contains the rewrite rule (see [vercel.json Configuration](#vercel-json-configuration)).

#### CORS errors in browser console

- **Cause**: Backend CORS policy does not include the frontend origin.
- **Fix**: Verify `AllowedOrigins` configuration includes the exact frontend URL (including protocol, no trailing slash). Ensure `AllowCredentials()` is set if using SignalR.

#### SignalR connection fails with 403

- **Cause**: CORS not configured for credentials, or WebSockets not enabled.
- **Fix**: Ensure `AllowCredentials()` is in the CORS policy and WebSockets are enabled on the hosting platform.

#### EF Core migration fails with "relation already exists"

- **Cause**: Database schema is out of sync with migration history.
- **Fix**: Use idempotent scripts: `dotnet ef migrations script --idempotent`. For a fresh start in development, drop and recreate the database.

#### Connection string not found in production

- **Cause**: Environment variable naming uses wrong separator.
- **Fix**: Use double underscores (`__`) as section separators in environment variables: `ConnectionStrings__DefaultConnection`.

#### Docker container exits immediately

- **Cause**: Database is not ready when the API starts.
- **Fix**: Use `depends_on` with `condition: service_healthy` in Docker Compose (see [Docker Compose](#docker-compose-with-postgresql)).

#### JWT authentication returns 401

- **Cause**: JWT key, issuer, or audience mismatch between token generation and validation.
- **Fix**: Ensure `Jwt:Key`, `Jwt:Issuer`, and `Jwt:Audience` are identical across all backend instances and match the values used during token generation.

### Health Check Endpoint

Add a health check endpoint to verify the API and database connectivity:

```
GET /health
```

If the API returns `200 OK`, the service is running. If it returns `503 Service Unavailable`, check the database connection and application logs.

### Log Locations

| Platform | Log Access |
|---|---|
| Azure App Service | Azure Portal → App Service → **Log Stream** or `az webapp log tail` |
| Docker | `docker compose logs -f api` |
| Local Development | Console output / `dotnet run` terminal |