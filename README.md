# Avante AI Compliance

An AI-powered compliance management platform designed to streamline regulatory compliance workflows, automate audit processes, and provide intelligent risk assessment for organizations.

## Architecture Overview

This project is organized as a **monorepo** with two main directories:

```
avante-ai-compliance/
├── Backend/          # ASP.NET Core 9 Web API
├── Frontend/         # React 18 + Vite SPA
└── README.md
```

- **Backend/** — C# 12+ ASP.NET Core 9 Web API providing RESTful endpoints, authentication, authorization, and database access via Entity Framework Core.
- **Frontend/** — JavaScript (ES2022+) React 18 application bundled with Vite, styled with Tailwind CSS, communicating with the backend API.

## Tech Stack

### Backend
- **Runtime:** .NET 9 SDK
- **Language:** C# 12+
- **Framework:** ASP.NET Core 9 Web API
- **ORM:** Entity Framework Core 9
- **Database:** PostgreSQL
- **Authentication:** JWT Bearer Tokens
- **API Documentation:** Swagger / OpenAPI

### Frontend
- **Language:** JavaScript ES2022+
- **UI Library:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **State Management:** React Context API

## Folder Structure

```
avante-ai-compliance/
├── Backend/
│   ├── Controllers/          # API controllers
│   ├── Data/                 # DbContext and database configuration
│   ├── DTOs/                 # Data Transfer Objects
│   ├── Entities/             # EF Core entity models
│   ├── Middleware/           # Custom middleware (auth, error handling)
│   ├── Services/             # Business logic services
│   ├── Migrations/           # EF Core migrations (auto-generated)
│   ├── Program.cs            # Application entry point
│   ├── appsettings.json      # Configuration
│   └── Backend.csproj        # Project file
│
├── Frontend/
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── api/              # API client and service modules
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React Context providers
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page/route components
│   │   ├── utils/            # Utility functions
│   │   ├── App.jsx           # Root component with routing
│   │   ├── main.jsx          # Application entry point
│   │   └── index.css         # Tailwind CSS imports
│   ├── index.html            # HTML template
│   ├── vite.config.js        # Vite configuration
│   ├── tailwind.config.js    # Tailwind configuration
│   ├── postcss.config.js     # PostCSS configuration
│   └── package.json          # Dependencies and scripts
│
└── README.md
```

## Prerequisites

Ensure the following are installed on your development machine:

- **Node.js** — v18.0 or later ([download](https://nodejs.org/))
- **.NET 9 SDK** — v9.0 or later ([download](https://dotnet.microsoft.com/download/dotnet/9.0))
- **PostgreSQL** — v15 or later ([download](https://www.postgresql.org/download/))

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd avante-ai-compliance
```

### 2. Database Setup

Create a PostgreSQL database for the application:

```sql
CREATE DATABASE avante_compliance;
CREATE USER avante_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE avante_compliance TO avante_user;
```

### 3. Backend Setup

```bash
cd Backend

# Restore NuGet packages
dotnet restore

# Update the connection string in appsettings.json (see Environment Variables section)

# Apply database migrations
dotnet ef database update

# Run the backend API
dotnet run
```

The API will start at `https://localhost:5001` (HTTPS) and `http://localhost:5000` (HTTP) by default.

### 4. Frontend Setup

```bash
cd Frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend development server will start at `http://localhost:5173` by default.

## Environment Variable Configuration

### Backend — `appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=avante_compliance;Username=avante_user;Password=your_secure_password"
  },
  "Jwt": {
    "Key": "your-256-bit-secret-key-here-minimum-32-characters",
    "Issuer": "AvanteAICompliance",
    "Audience": "AvanteAIComplianceUsers",
    "ExpirationInMinutes": 60
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

> **Important:** Never commit production secrets to source control. Use environment variables or a secrets manager for production deployments.

### Frontend — `.env`

Create a `.env` file in the `Frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

All frontend environment variables must be prefixed with `VITE_` to be accessible via `import.meta.env`.

## API Endpoint Summary

### Authentication
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| POST   | `/api/auth/register`  | Register a new user      |
| POST   | `/api/auth/login`     | Authenticate and get JWT |
| POST   | `/api/auth/refresh`   | Refresh an expired token |

### Users
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | `/api/users`          | List all users (Admin)   |
| GET    | `/api/users/{id}`     | Get user by ID           |
| PUT    | `/api/users/{id}`     | Update user profile      |
| DELETE | `/api/users/{id}`     | Delete a user (Admin)    |

### Compliance Policies
| Method | Endpoint              | Description                  |
|--------|-----------------------|------------------------------|
| GET    | `/api/policies`       | List all compliance policies |
| GET    | `/api/policies/{id}`  | Get policy details           |
| POST   | `/api/policies`       | Create a new policy          |
| PUT    | `/api/policies/{id}`  | Update an existing policy    |
| DELETE | `/api/policies/{id}`  | Delete a policy              |

### Audits
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | `/api/audits`         | List all audits          |
| GET    | `/api/audits/{id}`    | Get audit details        |
| POST   | `/api/audits`         | Create a new audit       |
| PUT    | `/api/audits/{id}`    | Update audit status      |

### Risk Assessments
| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| GET    | `/api/risks`              | List all risk assessments      |
| GET    | `/api/risks/{id}`         | Get risk assessment details    |
| POST   | `/api/risks`              | Create a risk assessment       |
| POST   | `/api/risks/{id}/analyze` | Run AI analysis on a risk item |

### Reports
| Method | Endpoint                  | Description                  |
|--------|---------------------------|------------------------------|
| GET    | `/api/reports`            | List generated reports       |
| POST   | `/api/reports/generate`   | Generate a compliance report |
| GET    | `/api/reports/{id}/download` | Download a report         |

## User Roles

The application supports role-based access control (RBAC) with the following roles:

| Role              | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| **Admin**         | Full system access. Manage users, policies, audits, and all configurations. |
| **ComplianceOfficer** | Create and manage compliance policies, run audits, generate reports.    |
| **Auditor**       | View policies, conduct audits, submit findings, and view reports.           |
| **Viewer**        | Read-only access to policies, audit results, and reports.                   |

## Development Workflow

### Running Both Services Simultaneously

Open two terminal windows:

**Terminal 1 — Backend:**
```bash
cd Backend
dotnet watch run
```

**Terminal 2 — Frontend:**
```bash
cd Frontend
npm run dev
```

The `dotnet watch run` command enables hot reload for the backend during development.

### Building for Production

**Backend:**
```bash
cd Backend
dotnet publish -c Release -o ./publish
```

**Frontend:**
```bash
cd Frontend
npm run build
```

The frontend production build will be output to `Frontend/dist/`.

### Running Tests

**Backend:**
```bash
cd Backend
dotnet test
```

**Frontend:**
```bash
cd Frontend
npm run test
```

### Code Quality

- Backend follows C# coding conventions with nullable reference types enabled.
- Frontend uses ESLint for linting and consistent code style.
- All async operations include proper error handling.
- API responses follow consistent JSON structures with appropriate HTTP status codes.

## License

**Private** — All rights reserved. This software is proprietary and confidential. Unauthorized copying, distribution, or modification of this project is strictly prohibited.