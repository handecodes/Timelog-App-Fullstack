# Deployment and Azure configuration steps

This document lists the commands and steps to configure Azure resources and pipeline for the Timelog-App-Fullstack project.

> These are example commands using the Azure CLI. Replace resource names and values with your actual names.

## Prerequisites
- Azure CLI installed and logged in
- Owner or Contributor permissions for the subscription (for initial setup)
- GitHub repository with GitHub Actions enabled

## 1. Create an Azure Container Registry (if not already)

az acr create \
  --resource-group myResourceGroup \
  --name myACRName \
  --sku Standard

## 2. Assign OIDC in GitHub Actions

Use the `azure/login` action with OIDC - create a service principal or use workload identity federation. See the workflow template in `.github/workflows/ci-cd.yaml`.

## 3. Give the pipeline rights to push images to ACR

# Option A: Use a service principal (least privilege)
az ad sp create-for-rbac --name "github-actions-acr" --role acrpush --scopes "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.ContainerRegistry/registries/<acr>"

Store the returned client id and secret in GitHub Secrets: `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.

# Option B: Use OIDC and federated identity (recommended)
- Configure workload identity federation in GitHub and grant the federated identity the `AcrPush` role on ACR.

## 4. Configure Key Vault and Managed Identities

# Create Key Vault
az keyvault create -n kv-k5-teamproj -g <rg> -l <location>

# Add secrets
az keyvault secret set --vault-name kv-k5-teamproj --name "Jwt--Key" --value "<your-jwt-key>"
az keyvault secret set --vault-name kv-k5-teamproj --name "OllamaApiKey" --value "<ollama-key>"

# Assign Managed Identity to Container Apps
# TimelogAPI
az containerapp identity assign --name timelogapi --resource-group <rg>
# ProxyAPI
az containerapp identity assign --name proxyapi --resource-group <rg>

# Retrieve principal IDs
TIMelog_PRINCIPAL_ID=$(az containerapp show -g <rg> -n timelogapi --query identity.principalId -o tsv)
PROXY_PRINCIPAL_ID=$(az containerapp show -g <rg> -n proxyapi --query identity.principalId -o tsv)

# Grant Key Vault access to the managed identities
az keyvault set-policy -n kv-k5-teamproj --object-id $TIMelog_PRINCIPAL_ID --secret-permissions get list
az keyvault set-policy -n kv-k5-teamproj --object-id $PROXY_PRINCIPAL_ID --secret-permissions get list

## 5. Configure Container Apps environment variables (Key Vault references)
az containerapp update -g <rg> -n timelogapi --set configuration.secrets[0].name=JwtKey --set configuration.secrets[0].value="@Microsoft.KeyVault(VaultName=kv-k5-teamproj;SecretName=Jwt--Key)"

# Or configure settings in the Container App: set environment variables to reference Key Vault

## 6. Monitoring
# Enable App Insights (instrumentation key stored in Key Vault)
az monitor app-insights component create -g <rg> -n timelogapi-ai --location <location>

# Configure TimelogAPI with APPINSIGHTS_INSTRUMENTATIONKEY as Key Vault secret or container app env var

## 7. CORS and Frontend configuration
- Update backend CORS to include the frontend's production URL(s).
- In the frontend build pipeline, set `VITE_API_URL` to `https://k5-teamproj.icysea-5b3a24a1.germanywestcentral.azurecontainerapps.io/api` or the Proxy API where appropriate.

## 8. AI Proxy
- Store Ollama API key in Key Vault and ensure only ProxyAPI managed identity has access.
- ProxyAPI will read API key via DefaultAzureCredential and call Ollama.

## 9. Rollout and testing
- Merge changes to `main` branch to trigger the pipeline.
- Validate logs in Application Insights and container logs in Azure Portal.


