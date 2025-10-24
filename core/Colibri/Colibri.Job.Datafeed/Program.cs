using Colibri.ExternalServices;
using Colibri.ExternalServices.Options;
using Colibri.Job.Datafeed.Options;
using Colibri.Job.Datafeed.Processor;
using Colibri.Job.Datafeed.Services;
using Microsoft.Extensions.Azure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Serilog;
using StackExchange.Redis;

var hostBuilder = Host.CreateDefaultBuilder()
    .ConfigureHostConfiguration(options =>
    {
        options.SetBasePath(Directory.GetCurrentDirectory());
        options.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
        options.AddEnvironmentVariables();
    })
    .ConfigureLogging(ConfigureLogging)
    .ConfigureServices(ConfigureServices);

await hostBuilder.RunConsoleAsync();

static void ConfigureServices(HostBuilderContext context, IServiceCollection services)
{
    var configuration = context.Configuration;

    // Bind configuration options
    var processingConfigurationSection = configuration.GetRequiredSection(ProcessingConfigurationOptions.Path);
    var iterableSection = configuration.GetRequiredSection(IterableOptions.Path);
    var azureServiceBusSection = configuration.GetRequiredSection(AzureServiceBusOptions.Path);
    var azureStorageSection = configuration.GetRequiredSection(AzureServiceStorageOptions.Path);
    var cacheSection = configuration.GetRequiredSection(CacheOptions.Path);

    var processingConfigurationOptions = processingConfigurationSection.Get<ProcessingConfigurationOptions>()
        ?? new ProcessingConfigurationOptions();
    var iterableOptions = iterableSection.Get<IterableOptions>() ?? new IterableOptions();
    var azureServiceBusOptions = azureServiceBusSection.Get<AzureServiceBusOptions>()
        ?? new AzureServiceBusOptions();
    var azureStorageOptions = azureStorageSection.Get<AzureServiceStorageOptions>()
        ?? new AzureServiceStorageOptions();
    var cacheOptions = cacheSection.Get<CacheOptions>() ?? new CacheOptions();

    // Register configuration options
    services.Configure<ProcessingConfigurationOptions>(processingConfigurationSection);
    services.Configure<IterableOptions>(iterableSection);
    services.Configure<AzureServiceBusOptions>(azureServiceBusSection);
    services.Configure<AzureServiceStorageOptions>(azureStorageSection);
    services.Configure<CacheOptions>(cacheSection);

    // Register HTTP client and memory cache infrastructure
    services.AddHttpClient();
    services.AddMemoryCache(); // Required by MemoryCacheService

    // Configure cache service based on provider (registers ICacheService)
    ConfigureCacheService(services, cacheOptions);

    // Register data source cache service (uses ICacheService)
    services.AddSingleton<IDataSourceCacheService, DataSourceCacheService>();

    // Register Azure services
    services.AddSingleton<IBlobService, BlobService>();
    services.AddSingleton<ITableStorageService, TableStorageService>();

    // Add Database Service
    services.AddSingleton<IDatabaseService, DatabaseService>();

    // Register processors
    services.AddSingleton<ICsvProcessor, CsvProcessor>();

    // Register business services
    services.AddSingleton<IIterableService, IterableService>();

    // Register Retry Policy Service (Polly)
    services.AddSingleton<IRetryPolicyService, RetryPolicyService>();

    // Register Azure clients
    services.AddAzureClients(builder =>
    {
        // Service Bus Client
        builder.AddServiceBusClient(azureServiceBusOptions.ConnectionString)
               .ConfigureOptions(options => { })
               .WithName(azureServiceBusOptions.Name);

        // Blob Service Client
        builder.AddBlobServiceClient(azureStorageOptions.ConnectionString);

        // Table Service Client
        builder.AddTableServiceClient(azureStorageOptions.ConnectionString);
    });

    // ⭐ SERVICE MODE ROUTING - Determines which background service to run
    var serviceMode = configuration.GetValue<string>("SERVICE_MODE")?.ToUpper() ?? "PROCESSING";

    Console.WriteLine("========================================");
    Console.WriteLine($"Service Mode: {serviceMode}");
    Console.WriteLine("========================================");

    if (serviceMode == "WARMUP")
    {
        // WARMUP JOB - Loads cache on demand (1 pod only, no RedLock needed)
        services.AddHostedService<DedicatedCacheWarmupService>();
        Console.WriteLine("✓ Cache Warmup Service registered");
        Console.WriteLine("✓ Subscription: " + azureServiceBusOptions.WarmupSubscription);
        Console.WriteLine("✓ Expected replicas: 1 (single pod)");
        Console.WriteLine("✓ No distributed lock needed");
    }
    else if (serviceMode == "PROCESSING")
    {
        // PROCESSING JOB - Processes CSV files using warm cache (3+ pods)
        services.AddHostedService<CsvProcessingService>();
        Console.WriteLine("✓ CSV Processing Service registered");
        Console.WriteLine("✓ Subscription: " + azureServiceBusOptions.Subscription);
        Console.WriteLine("✓ Expected replicas: 3+ (multi-pod)");
        Console.WriteLine("✓ Cache must be pre-warmed");
    }
    else
    {
        throw new InvalidOperationException(
            $"Invalid SERVICE_MODE: {serviceMode}. Valid values: WARMUP, PROCESSING");
    }

    Console.WriteLine("========================================");
}

static void ConfigureMemoryCache(IServiceCollection services)
{
    services.AddSingleton<ICacheService, MemoryCacheService>();
    Console.WriteLine("✓ Using In-Memory Cache");
}

static void ConfigureRedisCache(IServiceCollection services, CacheOptions cacheOptions)
{
    if (string.IsNullOrWhiteSpace(cacheOptions.RedisConnectionString))
    {
        throw new InvalidOperationException(
            "Redis connection string is required when Cache:Provider is set to 'Redis'. " +
            "Please configure Cache:RedisConnectionString in appsettings.json");
    }

    var redisConfigOptions = ConfigurationOptions.Parse(cacheOptions.RedisConnectionString);
    redisConfigOptions.ConnectTimeout = cacheOptions.RedisConnectTimeout;
    redisConfigOptions.SyncTimeout = cacheOptions.RedisSyncTimeout;
    redisConfigOptions.AbortOnConnectFail = cacheOptions.RedisAbortOnConnectFail;

    if (cacheOptions.RedisEnableRetry)
    {
        redisConfigOptions.ConnectRetry = 3;
        redisConfigOptions.ReconnectRetryPolicy = new ExponentialRetry(5000);
    }

    services.AddSingleton<IConnectionMultiplexer>(sp =>
    {
        var logger = sp.GetRequiredService<ILogger<Program>>();

        try
        {
            logger.LogInformation("Connecting to Redis: {Endpoint}",
                redisConfigOptions.EndPoints.FirstOrDefault());

            var connection = ConnectionMultiplexer.Connect(redisConfigOptions);

            connection.ConnectionFailed += (sender, args) =>
            {
                logger.LogError("Redis connection failed: {FailureType} - {Exception}",
                    args.FailureType, args.Exception?.Message);
            };

            connection.ConnectionRestored += (sender, args) =>
            {
                logger.LogInformation("Redis connection restored");
            };

            logger.LogInformation("✓ Connected to Redis successfully");
            return connection;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to connect to Redis");
            throw;
        }
    });

    services.AddSingleton<ICacheService, RedisCacheService>();
    Console.WriteLine("✓ Using Redis Cache");
}

static void ConfigureValkeyCache(IServiceCollection services, CacheOptions cacheOptions)
{
    if (string.IsNullOrWhiteSpace(cacheOptions.RedisConnectionString))
    {
        throw new InvalidOperationException(
            "Valkey connection string is required when Cache:Provider is set to 'Valkey'. " +
            "Please configure Cache:RedisConnectionString in appsettings.json");
    }

    var valkeyConfigOptions = ConfigurationOptions.Parse(cacheOptions.RedisConnectionString);
    valkeyConfigOptions.ConnectTimeout = cacheOptions.RedisConnectTimeout;
    valkeyConfigOptions.SyncTimeout = cacheOptions.RedisSyncTimeout;
    valkeyConfigOptions.AbortOnConnectFail = cacheOptions.RedisAbortOnConnectFail;

    if (cacheOptions.RedisEnableRetry)
    {
        valkeyConfigOptions.ConnectRetry = 3;
        valkeyConfigOptions.ReconnectRetryPolicy = new ExponentialRetry(5000);
    }

    services.AddSingleton<IConnectionMultiplexer>(sp =>
    {
        var logger = sp.GetRequiredService<ILogger<Program>>();

        try
        {
            logger.LogInformation("Connecting to Valkey: {Endpoint}",
                valkeyConfigOptions.EndPoints.FirstOrDefault());

            var connection = ConnectionMultiplexer.Connect(valkeyConfigOptions);

            connection.ConnectionFailed += (sender, args) =>
            {
                logger.LogError("Valkey connection failed: {FailureType} - {Exception}",
                    args.FailureType, args.Exception?.Message);
            };

            connection.ConnectionRestored += (sender, args) =>
            {
                logger.LogInformation("Valkey connection restored");
            };

            logger.LogInformation("✓ Connected to Valkey successfully");
            return connection;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to connect to Valkey");
            throw;
        }
    });

    Console.WriteLine("✓ Using Valkey Cache");
}

static void ConfigureCacheService(IServiceCollection services, CacheOptions cacheOptions)
{
    var provider = cacheOptions.Provider?.ToLower() ?? "memory";

    switch (provider)
    {
        case "valkey":
            ConfigureValkeyCache(services, cacheOptions);
            break;

        case "redis":
            ConfigureRedisCache(services, cacheOptions);
            break;

        case "memory":
        default:
            ConfigureMemoryCache(services);
            break;
    }
}

static void ConfigureLogging(HostBuilderContext context, ILoggingBuilder builder)
{
    var configuration = context.Configuration;

    builder.Configure(options =>
    {
        options.ActivityTrackingOptions = ActivityTrackingOptions.SpanId
                                           | ActivityTrackingOptions.TraceId
                                           | ActivityTrackingOptions.ParentId
                                           | ActivityTrackingOptions.Baggage
                                           | ActivityTrackingOptions.Tags;
    });

    Log.Logger = new LoggerConfiguration()
        .WriteTo.Console()
        .CreateLogger();

    builder.Services.AddSerilog();
}