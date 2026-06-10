using Microsoft.AspNetCore.Mvc;
using OllamaSharp;
using ProxyAPI.DTOs;

[ApiController]
[Route("api/[controller]")]
[Route("api/v1/[controller]")]
public class AiController : ControllerBase
{
    private readonly IOllamaApiClient _ollama;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public AiController(IOllamaApiClient ollama, IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _ollama = ollama;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    [HttpPost("ask")]
    public async Task<IActionResult> AskAi([FromBody] AiRequest request)
    {
        _ollama.SelectedModel = _configuration["OllamaModel"] ?? "gemma4:31b-cloud";
        var fullResponse = new System.Text.StringBuilder();

        await foreach (var stream in _ollama.GenerateAsync(request.Prompt))
        {
            fullResponse.Append(stream.Response);
        }

        return Ok(new { GeneratedMessage = fullResponse.ToString() });
    }
}