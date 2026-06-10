namespace ProxyAPI.Extensions
{
    public static class CorsExtension
    {
        public static IServiceCollection AddCustomCors(this IServiceCollection services)
        {
            services.AddCors(options =>
            {
                options.AddPolicy("StrictPolicy", policy =>
                {
                    policy
                        // allow common dev frontend origin and keep placeholder for production
                        .WithOrigins("http://localhost:5173", "https://localhost:3000", "https://<your-frontend-production-url>")
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
            });

            return services;
        }
    }
}