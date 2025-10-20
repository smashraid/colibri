using System;

namespace Colibri.Job.Datafeed.Options;

public class AzureServiceStorageOptions
{
    public const string Path = "Azure:Storage";
    public string ConnectionString { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
}
