# ADR: Full-stack deployment and security for Timelog-App-Fullstack

Date: 2026-06-10
Status: Proposed

## Context
You have two backend services deployed as Azure Container Apps:
- TimelogAPI: https://k5-teamproj.icysea-5b3a24a1.germanywestcentral.azurecontainerapps.io/
- ProxyAPI (AI): https://proxyapi.icysea-5b3a24a1.germanywestcentral.azurecontainerapps.io/

Goal: Deploy the full stack, implement CI/CD that builds, tests, images, and deploys automatically, ensure no secrets in the repo, use Key Vault for secrets, employ Managed Identity and least privilege RBAC, enable monitoring and logging, wire frontend to backend via configuration and CORS, and document AI integration.

## Decisions

1. Hosting
- Use Azure Container Apps for backend services (already deployed). Rationale: container apps provide easy scaling, integration with managed identities, and container-based deployment workflows.
- Frontend: static site hosted on Azure Static Web Apps or Azure Storage + CDN. Rationale: low-cost, supports custom domain, and integrates with GitHub Actions easily.

2. CI/CD Pipeline
- Use GitHub Actions to implement the pipeline on the `main` branch.
- Workflow steps: checkout, restore dependencies (dotnet restore / npm ci), run tests (dotnet test + frontend unit tests), build artifacts, build Docker images, push images to Azure Container Registry (ACR), and deploy to Azure Container Apps via `azure/cli` or `azure/arm-deploy` or `Azure/container-apps-deploy` actions.
- Tests must pass before images are pushed and deployments triggered.

3. Secrets and Key Vault
- Do not store secrets in the repo or logs.
- Use Azure Key Vault to store all sensitive values (JWT signing keys, Ollama API key, database strings, etc.).
- In CI, use GitHub Actions secrets to grant the pipeline a short-lived token to access Key Vault using a Service Principal; alternatively, use an OIDC flow to get a token for Azure without long-lived secrets.
- At runtime, enable Managed Identity on Container Apps and grant it access to Key Vault secrets (Get, List). Container Apps will retrieve secrets at startup using DefaultAzureCredential.

4. Managed Identity and RBAC
- Assign a System-assigned Managed Identity to each Container App (TimelogAPI, ProxyAPI).
- Grant Key Vault `Secret Get` and `Secret List` to those identities, scoped to only the needed secrets.
- Create an ACR identity with push rights for the pipeline (or let GitHub Actions push using a service principal with the least privilege to push to a single repository in ACR).
- Risks: Overly broad Key Vault or ACR permissions may expose secrets or allow image tampering. Document the exact role assignments and review periodically.

5. Monitoring and Observability
- Enable Application Insights or Azure Monitor for each service (using environment variables / instrumentation key from Key Vault). Log structured events and request traces.
- Correlate logs with request IDs: add middleware to generate or propagate `traceparent` headers and include them in logs.
- Configure alerts for high error rate and high latency.

6. Frontend ↔ Backend
- Configure frontend production base URL via environment variable (e.g., VITE_API_URL) set at build time in the pipeline or via Static Web Apps settings.
- Set CORS policies in the backend to only allow the frontend origin(s). For TimelogAPI and ProxyAPI, add production origin and keep localhost for development.

7. AI Integration
- ProxyAPI will call the Ollama API (or whichever AI provider) to generate responses. The API key is stored in Key Vault.
- Implement a ProxyAPI route that validates request, forwards data to the AI client, and returns filtered results.
- Rate limit the endpoint and validate inputs to avoid prompt injection.

## Implementation notes and steps

1. Update backend to read Key Vault in production (already implemented in Program.cs using DefaultAzureCredential and `AddAzureKeyVault`).
2. Configure Managed Identity for each Container App in Azure and add access policies in Key Vault granting `get` and `list` to each identity.
3. Update CORS: allow production frontend URL(s) and localhost for dev. (Files updated in codebase: `backend/ProxyAPI/Exstensions/CorsExstension.cs` and `backend/TimelogAPI/Program.cs`.)
4. Frontend: ensure `VITE_API_URL` is set in the build pipeline. In GitHub Actions, set this using environment variables or use Azure Static Web Apps build settings.
5. CI/CD: create `.github/workflows/ci-cd.yaml` that:
   - runs on push to `main`
   - checks out code
   - sets up dotnet and nodejs
   - restores and runs tests for backend and frontend
   - builds Docker images for TimelogAPI and ProxyAPI
   - pushes images to ACR
   - deploys the new images to Azure Container Apps
   - triggers frontend build and deploy to Static Web Apps (or uploads to storage)
6. Monitoring: configure Application Insights via environment variables. Add middleware to TimelogAPI/ProxyAPI to capture request / response logs and correlation id.
7. AI feature: create a simple endpoint `/api/ai/summarize` that accepts text and returns summarized text from the AI model. Store Ollama API key in Key Vault and use ProxyAPI to make the request.

## Risks
- Misconfigured Key Vault access grants could expose secrets.
- CI credentials leaked in workflow logs—avoid logging secrets, use OIDC or short-lived tokens.
- CORS misconfiguration could expose APIs to unwanted origins.

## Acceptance criteria
- Both services are externally reachable at the provided container apps URLs.
- GitHub Actions pipeline runs tests and only deploys on successful test runs.
- No secrets are present in the repository or logs; Key Vault is used in production.
- Managed identities are configured and documented with RBAC rationale.
- Application Insights or Azure Monitor is enabled and demonstrates tracing and error identification.
- Frontend is configured to call the TimelogAPI production URL and CORS is configured.
- AI functionality (e.g., summarization) is available via ProxyAPI and documented.

