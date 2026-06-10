using System.Diagnostics;
using System.Text;

namespace TimelogAPI.Middleware
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

            await _next(context);
        }
    }
}
