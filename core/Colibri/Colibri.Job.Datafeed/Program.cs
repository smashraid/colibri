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

    // Register configuration options
    services.Configure<ProcessingConfigurationOptions>(processingConfigurationSection);
    services.Configure<IterableOptions>(iterableSection);
    services.Configure<AzureServiceBusOptions>(azureServiceBusSection);
    services.Configure<AzureServiceStorageOptions>(azureStorageSection);

    // Register HTTP client and memory cache
    services.AddHttpClient();
    services.AddMemoryCache();

    // Register cache services
    services.AddSingleton<ICacheService, MemoryCacheService>();
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