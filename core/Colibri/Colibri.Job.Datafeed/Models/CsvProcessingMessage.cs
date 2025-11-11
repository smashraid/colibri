using System;

namespace Colibri.Job.Datafeed.Models;

public class CsvProcessingMessage
{
    /// <summary>
    /// Message type for filtering: "CsvProcessing"
    /// </summary>
    public string MessageType { get; set; } = "CsvProcessing";

    /// <summary>
    /// Main CSV file configuration to process
    /// </summary>
    public CsvConfiguration CsvConfiguration { get; set; } = new();

    /// <summary>
    /// Names of datasources to use (must be warmed up first!)
    /// </summary>
    public List<DatasourceReference> RequiredDatasources { get; set; } = [];
}
