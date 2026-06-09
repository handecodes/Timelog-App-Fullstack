using Azure.Extensions.AspNetCore.Configuration.Secrets;
using Azure.Identity;
using OllamaSharp;
using ProxyAPI.Extensions;
using Scalar.AspNetCore;
using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);

if (!builder.Environment.IsDevelopment())
{
    builder.Configuration.AddAzureKeyVault(
        new Uri("https://kv-k5-teamproj.vault.azure.net/"),
        new DefaultAzureCredential());
}

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddHttpClient("TimelogAPIClient", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["TimelogApiUrl"]);
});

var ollamaUrl = new Uri("https://ollama.com");
var apiKey = builder.Configuration["OllamaApiKey"] ?? throw new Exception("Ollama API key is not configured.");

builder.Services.AddScoped<IOllamaApiClient>(sp =>
{
    var httpClient = new HttpClient { BaseAddress = ollamaUrl };
    httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

    return new OllamaApiClient(httpClient);
});

builder.Services.AddCustomCors();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseCors("StrictPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class  Program { } // Must be at the bottom of the file to be able to access the Program class from the test project.
