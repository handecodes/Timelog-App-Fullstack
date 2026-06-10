using System.Diagnostics;
using System.Text.Json;

namespace Common.Middleware
{
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;

        public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task Invoke(HttpContext context)
        {
            var traceId = Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier;
            context.Request.Headers.TryGetValue("X-Request-Id", out var requestIdHeader);
            var requestId = requestIdHeader.FirstOrDefault() ?? Guid.NewGuid().ToString();

            _logger.LogInformation("Incoming request {method} {path} traceId={traceId} requestId={requestId}",
                context.Request.Method, context.Request.Path, traceId, requestId);

            // Capture response
            var originalBody = context.Response.Body;
            using var newBody = new MemoryStream();
            context.Response.Body = newBody;

            var sw = Stopwatch.StartNew();
            try
            {
                await _next(context);
            }
            finally
            {
                sw.Stop();
                context.Response.Body.Seek(0, SeekOrigin.Begin);
                var responseText = await new StreamReader(context.Response.Body).ReadToEndAsync();
                context.Response.Body.Seek(0, SeekOrigin.Begin);

                _logger.LogInformation("Response {statusCode} for {path} took {elapsed}ms traceId={traceId} requestId={requestId} responseBody={responseBody}",
                    context.Response.StatusCode, context.Request.Path, sw.ElapsedMilliseconds, traceId, requestId,
                    responseText.Length > 1000 ? responseText[..1000] + "..." : responseText);

                await newBody.CopyToAsync(originalBody);
                context.Response.Body = originalBody;
            }
        }
    }
}
