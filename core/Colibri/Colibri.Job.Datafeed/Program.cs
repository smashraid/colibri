using Colibri.ExternalServices;
using Colibri.ExternalServices.Options;
using Colibri.Job.Datafeed.Models;
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
    var processingConfigurationOptions = processingConfigurationSection.Get<ProcessingConfigurationOptions>()
        ?? new ProcessingConfigurationOptions();

    var iterableSection = configuration.GetRequiredSection(IterableOptions.Path);
    var iterableOptions = iterableSection.Get<IterableOptions>() ?? new IterableOptions();

    var azureServiceBusSection = configuration.GetRequiredSection(AzureServiceBusOptions.Path);
    var azureServiceBusOptions = azureServiceBusSection.Get<AzureServiceBusOptions>()
        ?? new AzureServiceBusOptions();

    var azureStorageSection = configuration.GetRequiredSection(AzureServiceStorageOptions.Path);
    var azureStorageOptions = azureStorageSection.Get<AzureServiceStorageOptions>()
        ?? new AzureServiceStorageOptions();

    var cacheSection = configuration.GetRequiredSection(CacheOptions.Path);
    var cacheOptions = cacheSection.Get<CacheOptions>() ?? new CacheOptions();

    // Register configuration options
    services.Configure<ProcessingConfigurationOptions>(processingConfigurationSection);
    services.Configure<IterableOptions>(iterableSection);
    services.Configure<AzureServiceBusOptions>(azureServiceBusSection);
    services.Configure<AzureServiceStorageOptions>(azureStorageSection);
    services.Configure<CacheOptions>(cacheSection);

    // Register HTTP client and memory cache
    services.AddHttpClient();
    services.AddMemoryCache();

    // Configure cache service based on provider
    ConfigureCacheService(services, cacheOptions);

    // Register cache services
    services.AddSingleton<ICacheService, MemoryCacheService>();
    services.AddSingleton<ICacheService, RedisCacheService>();
    services.AddSingleton<ICacheService, ValkeyCacheService>();
    services.AddSingleton<IDataSourceCacheService, DataSourceCacheService>();

    // Register Azure services
    services.AddSingleton<IBlobService, BlobService>();
    services.AddSingleton<ITableStorageService, TableStorageService>();

    // Add Database Service
    services.AddSingleton<IDatabaseService, DatabaseService>();

    // Register processors
    services.AddSingleton<ICsvProcessor, CsvProcessor>();
    services.AddSingleton<IMessageProcessor<DataSourceConfiguration>, AzureMessageProcessor>();

    // Register business services
    services.AddSingleton<IIterableService, IterableService>();

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

    // Register the background service
    services.AddHostedService<AzureMessageProcessingService>();
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

    // Configure Redis connection
    var redisConfigOptions = ConfigurationOptions.Parse(cacheOptions.RedisConnectionString);
    redisConfigOptions.ConnectTimeout = cacheOptions.RedisConnectTimeout;
    redisConfigOptions.SyncTimeout = cacheOptions.RedisSyncTimeout;
    redisConfigOptions.AbortOnConnectFail = cacheOptions.RedisAbortOnConnectFail;

    if (cacheOptions.RedisEnableRetry)
    {
        redisConfigOptions.ConnectRetry = 3;
        redisConfigOptions.ReconnectRetryPolicy = new ExponentialRetry(5000); // 5 seconds
    }

    // Register ConnectionMultiplexer as singleton
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
            logger.LogError(ex, "Failed to connect to Redis. Falling back to in-memory cache.");
            throw;
        }
    });

    // Register Redis cache service
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

    // Configure Valkey connection (uses Redis protocol)
    var valkeyConfigOptions = ConfigurationOptions.Parse(cacheOptions.RedisConnectionString);
    valkeyConfigOptions.ConnectTimeout = cacheOptions.RedisConnectTimeout;
    valkeyConfigOptions.SyncTimeout = cacheOptions.RedisSyncTimeout;
    valkeyConfigOptions.AbortOnConnectFail = cacheOptions.RedisAbortOnConnectFail;

    if (cacheOptions.RedisEnableRetry)
    {
        valkeyConfigOptions.ConnectRetry = 3;
        valkeyConfigOptions.ReconnectRetryPolicy = new ExponentialRetry(5000);
    }

    // Register ConnectionMultiplexer as singleton
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
    var serilogSplunkConfiguration = configuration.GetRequiredSection(SerilogSplunkOptions.Path)
       .Get<SerilogSplunkOptions>() ?? new SerilogSplunkOptions();

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
        // Uncomment below for Splunk integration
        // .WriteTo.EventCollector(
        //     splunkHost: serilogSplunkConfiguration.SplunkHost,
        //     eventCollectorToken: serilogSplunkConfiguration.EventCollectorToken,
        //     sourceType: serilogSplunkConfiguration.SourceType,
        //     host: serilogSplunkConfiguration.Host,
        //     index: serilogSplunkConfiguration.Index,
        //     batchIntervalInSeconds: serilogSplunkConfiguration.BatchIntervalInSeconds,
        //     batchSizeLimit: serilogSplunkConfiguration.BatchSizeLimit,
        //     fields: serilogSplunkConfiguration.Fields,
        //     restrictedToMinimumLevel: Serilog.Events.LogEventLevel.Information
        // )
        // .Enrich.FromGlobalLogContext()
        // .Enrich.FromLogContext()
        // .Enrich.WithClientIp()
        // .Enrich.WithCorrelationId()
        // .Enrich.WithThreadId()
        // .Enrich.WithThreadName()
        // .Enrich.WithMachineName()
        // .Enrich.WithEnvironmentName()
        // .Enrich.WithEnvironmentUserName()
        // .Enrich.WithProcessId()
        // .Enrich.WithProcessName()
        .CreateLogger();

    builder.Services.AddSerilog();
}