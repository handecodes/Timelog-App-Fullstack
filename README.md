# Fullstack Application – Operations, CI/CD, Security and AI Integration

## 1. Architecture Overview

### System Architecture

The application consists of the following components:

* **Frontend**

  * JavaScript
  * Hosted in Container App
  * Communicates with the backend via HTTPS

* **Backend**

  * ASP.NET Core Web API
  * Runs in Azure Container Apps
  * Exposes REST endpoints

* **Database**

  * In-Memory

* **AI Service**

  * Ollama

* **Azure Key Vault**

  * Handles all secrets

### API Endpoints

| Method   | Endpoint      | Description  |
| -------- | ------------- | ------------ |
| e.g. GET | endpoint name | what it does |
|          |               |              |

---

# 2. Running the System Locally

## Requirements

* Docker Desktop
* .NET SDK
* Node.js
* Git

Clone the project


## Backend

Create file:

```bash
appsettings.Development.json
```

Example:

```json
{
  "ConnectionStrings": {
    "Database": "..."
  },
  "Ollama": {
    "ApiKey": "..."
  }
}
```

Start backend:

```bash
dotnet restore
dotnet run
```

## Frontend

Install dependencies:

```bash
npm install
```

Start:

```bash
npm run
```

---

# 3. CI/CD

## Pipeline Trigger on PR

1. Build
2. Tests
3. Docker build
4. Push to Azure Container Registry
5. Deployment to Azure

## Container Tags

Each image is tagged with: sha

Example:

```text
backend:a34f8bc
```

This makes deployments traceable.

## Deployment Flow

```text
GitHub
  │
  ▼
GitHub Actions
  │
  ▼
Azure Container Registry
  │
  ▼
Azure Container Apps
```

---

# 4. Secrets and Key Vault

## Local Development

Locally the following are used:

```text
appsettings.Development.json
User Secrets
Environment Variables
```

These files are never committed to Git.

## Production

In production, secrets are retrieved from:

```text
Azure Key Vault
```

---

# 5. Monitoring and Logging

## Tools

* Azure Log Analytics



---

# 6. AI Function

## Purpose

The system contains an AI function that can:

* Affirmations based on the time you used for work

## Request Flow

Frontend:

```http
POST /api/ai/summarize
```

Backend:

1. Validates input
2. Retrieves API key from Key Vault
3. Calls the AI service
4. Returns the response

## Security

### AI Key

Storage:

```text
Azure Key Vault
```

Never exposed to the frontend.

### Rate Limiting

The backend limits the number of requests per user.

### Input Validation

Checks:

* Empty values
* Maximum length
* Invalid content

### Error Handling

If the AI service does not respond, the user receives a clear error message.

## Testing

Verified through:

* Unit Tests
* Integration Tests
* Manual Testing in the Production Environment

Test Cases:

1. Valid input
2. Empty input
3. Input too long
4. Timeout from AI service
5. Invalid API key
