using Amazon.SQS;
using Colibri.ExternalServices;
using Colibri.ExternalServices.Options;
using Colibri.Job.Models;
using Colibri.Job.Options;
using Colibri.Job.Processor;
using Colibri.Job.Services;
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
})
.ConfigureLogging(ConfigureLogging)
.ConfigureServices(ConfigureServices);

await hostBuilder.RunConsoleAsync();

static void ConfigureServices(HostBuilderContext context, IServiceCollection services)
{
    var configuration = context.Configuration;
    var awsSection = configuration.GetRequiredSection(SQSOptions.Path);
    var awsOptions = awsSection.Get<SQSOptions>() ?? new SQSOptions();
    var iterableSection = configuration.GetRequiredSection(IterableOptions.Path);
    var iterableOptions = awsSection.Get<IterableOptions>() ?? new IterableOptions();
    var digitalCommunicationSection = configuration.GetRequiredSection(DigitalCommunicationOptions.Path);
    var digitalCommunicationOptions = awsSection.Get<DigitalCommunicationOptions>() ?? new DigitalCommunicationOptions();

    services.Configure<HostOptions>(hostOptions =>
    {
        hostOptions.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
    });
    services.Configure<SQSOptions>(awsSection);
    services.Configure<IterableOptions>(iterableSection);
    services.Configure<DigitalCommunicationOptions>(digitalCommunicationSection);
    services.AddDefaultAWSOptions(configuration.GetAWSOptions());
    services.AddHttpClient();
    services.AddAWSService<IAmazonSQS>();
    services.AddSingleton<IMessageProcessor<RawMessageDelivery>, AmazonSQSMessageProcessor>();
    services.AddScoped<IIterableService, IterableService>();
    services.AddScoped<IDigitalCommunicationService, DigitalCommunicationService>();

    services.AddHostedService<AWSSQSProcessingService>();
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
        .WriteTo.EventCollector(
            splunkHost: serilogSplunkConfiguration.SplunkHost,
            eventCollectorToken: serilogSplunkConfiguration.EventCollectorToken,
            sourceType: serilogSplunkConfiguration.SourceType,
            host: serilogSplunkConfiguration.Host,
            index: serilogSplunkConfiguration.Index,
            batchIntervalInSeconds: serilogSplunkConfiguration.BatchIntervalInSeconds,
            batchSizeLimit: serilogSplunkConfiguration.BatchSizeLimit,
            fields: serilogSplunkConfiguration.Fields,
            restrictedToMinimumLevel: Serilog.Events.LogEventLevel.Information
        )
        .Enrich.FromGlobalLogContext()
        .Enrich.FromLogContext()
        .Enrich.WithClientIp()
        .Enrich.WithCorrelationId()
        .Enrich.WithThreadId()
        .Enrich.WithThreadName()
        .Enrich.WithMachineName()
        .Enrich.WithEnvironmentName()
        .Enrich.WithEnvironmentUserName()
        .Enrich.WithProcessId()
        .Enrich.WithProcessName()
        .CreateLogger();
    builder.Services.AddSerilog();
}