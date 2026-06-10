# ADR & System Design – Timelog Fullstack Application (K5)

This document records the architecture and security decisions for deploying the
Timelog fullstack application to Azure, the CI/CD design, the external AI
integration, and a written evaluation of the AI results. It is written
individually and reflects the decisions I made and can account for.

---

## 1. System overview

The system consists of three deployable parts:

- **TimelogAPI** – the main ASP.NET Core API (time entries, categories, auth).
  Deployed as an Azure Container App.
- **ProxyAPI** – an ASP.NET Core service that proxies requests to an external
  AI service (Ollama Cloud). Deployed as a separate Azure Container App.
- **Frontend** – a static (vanilla JS) client.

Both APIs run in the same Azure Container Apps environment, pull their images
from Azure Container Registry, and read their secrets from Azure Key Vault
through a system-assigned Managed Identity.

---

## 2. Hosting decision – Azure Container Apps over App Service

**Decision:** Host both APIs on Azure Container Apps (ACA).

**Why:**
- ACA is built specifically for containers, which matches the assignment's
  requirement to containerise the application.
- It scales to zero, so the app costs nothing when idle. This matters on an
  Azure for Students budget.
- Managed Identity is simple to enable, which supports the secret-management
  strategy below.
- No Kubernetes cluster or VM to manage.

**Consequences:** I needed to set up Azure Container Registry to store the
images, and grant each Container App's Managed Identity the minimal roles it
needs (pull from ACR, read from Key Vault).

---

## 3. Containerisation – multi-stage build

**Decision:** Each API uses a multi-stage Dockerfile.

- Stage 1 (build): restores and compiles the project.
- Stage 2 (runtime): copies only the published output, not the source code or
  build tools.

**Why:** A smaller final image, faster deploys, and a reduced attack surface
(the runtime image does not contain the SDK or source). The container exposes
port 8080, a non-privileged port.

---

## 4. CI/CD design

**Decision:** GitHub Actions with separated CI and CD workflows.

- **CI** runs on push/PR to `main`: `dotnet restore`, `dotnet build`,
  `dotnet test`. If tests fail, nothing deploys.
- **CD** runs after CI completes successfully (via `workflow_run`): logs in to
  ACR, builds and pushes the Docker image tagged with the commit SHA and
  `latest`, logs in to Azure, and deploys the new image to the Container App.

Each service (TimelogAPI and ProxyAPI) has its own deploy workflow.

**How this affects quality, traceability and delivery:**
- **Quality** – tests must pass before any deploy can run.
- **Traceability** – every image is tagged with the commit SHA, so I can always
  tell exactly which commit is running in production.
- **Delivery cadence** – deploys are automatic on a green build to `main`; no
  manual deployment step.

**Lesson recorded:** GitHub only executes workflow files located in the
repository-root `.github/workflows/` directory. An earlier copy of the deploy
workflow lived under `backend/.github/workflows/` and never ran, because GitHub
ignores workflow files outside the root. Moving the ProxyAPI deploy workflow to
the root `.github/workflows/` and pointing its `workflow_run` trigger at the
correct CI workflow name fixed it.

---

## 5. Secure configuration – Azure Key Vault

**Decision:** All secrets are stored in Azure Key Vault and read at runtime via
Managed Identity. No secrets live in code, in `appsettings.json`, or in
version-controlled files.

**Secrets in the vault:**
- `Jwt--Key` – the JWT signing key for TimelogAPI.
- `OllamaApiKey` – the API key for the external AI service used by ProxyAPI.
- `TimelogApiUrl` – the production base URL ProxyAPI uses to reach TimelogAPI.

**Secret separation per environment:**
- **Local development:** .NET User Secrets.
- **Production:** Azure Key Vault, loaded only when the app is not running in
  the Development environment.
- **Never:** in code, in committed config files, or in plain environment
  variables for sensitive values.

The only configuration value kept in the app is the Key Vault URL, which is not
sensitive.

---

## 6. Least privilege – Managed Identity and RBAC

**Decision:** Each Container App uses a system-assigned Managed Identity and is
granted only the roles it needs.

- **System-assigned Managed Identity** – the identity is tied to the app's
  lifecycle and has no password or key that could leak.
- **Key Vault Secrets User** – read-only access to secrets. The identity can
  read secrets but cannot create, delete, or manage the vault.
- **AcrPull** – pull-only access to the container registry, so the app can pull
  its image but not push or modify the registry.

This follows the principle of least privilege: each identity gets exactly the
permissions it needs and nothing more, and secrets stay separated from the
application code.

---

## 7. External AI integration

**Decision:** ProxyAPI integrates an external AI service (Ollama Cloud) over
HTTP.

- The Ollama base URL (`https://ollama.com`) is the cloud host; the API key is
  read from Key Vault.
- The model is read from configuration (`OllamaModel`), defaulting to
  `gemma4:31b-cloud` (a cloud-supported model tag).
- The endpoint `POST /api/ai/ask` accepts a prompt and returns the generated
  message.

**Error handling:** The service uses exception middleware that returns a
structured `ProblemDetails` response on failure rather than leaking stack
traces, and an HTTP timeout so a slow upstream call does not hang indefinitely.

**Authentication-related note (known limitation):** The login endpoint currently
uses a single hardcoded demo credential. This is acceptable for a course demo
but is not production-safe; a production version would store hashed credentials
in a user store with a proper registration flow. This is documented honestly
rather than hidden.

---

## 8. Written evaluation of the AI results

The assignment requires a written assessment of where the AI service performs
well and where it performs poorly, based on real output.

**Where it performs well:**
- *Factual, well-scoped technical questions.* Asked to explain a JWT in two
  sentences, the model returned an accurate, concise definition
  ("A JSON Web Token is a compact, URL-safe means of representing claims between
  two parties as a digitally signed..."). Short, bounded questions with a clear
  correct answer are handled reliably.

**Where it performs poorly / limitations found:**
- *No input validation.* Sending an empty prompt returned an empty
  `generatedMessage` with no error. The application accepts empty input and
  passes it straight to the model. A production version should validate that the
  prompt is non-empty and reject it with a clear error before calling the model.
- *General LLM limitations.* Output is non-deterministic, the model can produce
  plausible-but-wrong answers (hallucination), and it has no knowledge of the
  application's own data unless that data is supplied in the prompt. Responses
  should therefore be treated as assistive, not authoritative.

**Conclusion:** The integration is suitable for assistive, low-stakes text
generation. For anything requiring correctness guarantees, the output would need
validation, and the service would need input validation and stricter error
handling than the current demo provides.

---

## 9. Monitoring and observability

**Decision:** Use the Log Analytics workspace connected to the Container Apps
environment for basic monitoring.

- Container console logs (stdout/stderr) and platform metrics flow to Log
  Analytics automatically.
- Logs are queryable with KQL (e.g. `ContainerAppConsoleLogs_CL`), which I used
  to confirm startup, environment, and the listening port for each revision.
- The live Log stream was used throughout development to debug startup failures
  (for example, a missing JWT key crashing the container on boot).

Azure Container Apps does not support Application Insights auto-instrumentation,
so richer request/latency telemetry would require adding the Application Insights
SDK to each API. For the current scope, log and metric collection through Log
Analytics provides the basic observability needed to find and follow errors in
production.

---

## 10. Constraint encountered – frontend hosting

**Context:** The plan was to host the static frontend on Azure Static Web Apps.

**Problem:** Creation failed with `RequestDisallowedByAzure`. Azure for Students
subscriptions are restricted by policy to a small, per-subscription set of
regions, and Static Web Apps are only offered in a different fixed set of
backend regions. The two sets do not overlap, so creation fails regardless of
which region is selected, and the restriction cannot be overridden by the user.

**Decision:** Document the constraint and use an Azure-native alternative
suitable for static files on a student subscription (Azure Blob Storage static
website or hosting the static files in a container), rather than Static Web Apps.

**Why this is recorded:** It is a real platform limitation, not a configuration
mistake, and recording the cause and the chosen workaround is the purpose of an
ADR.

---

## 11. Summary of decisions

| Area | Decision | Main reason |
|---|---|---|
| Hosting | Azure Container Apps | Container-native, scales to zero, easy Managed Identity |
| Image | Multi-stage Dockerfile, port 8080 | Smaller image, smaller attack surface |
| CI/CD | GitHub Actions, separate CI/CD, SHA-tagged images | Quality gate + traceability |
| Secrets | Azure Key Vault via Managed Identity | No secrets in code or repo |
| Access | System-assigned identity, Key Vault Secrets User, AcrPull | Least privilege |
| AI | Ollama Cloud over HTTP, key in Key Vault, model from config | External AI with secure key handling |
| Monitoring | Log Analytics + KQL | Basic observability for finding errors |
| Frontend host | Blob static site / container (not Static Web Apps) | Student region policy blocks Static Web Apps |
