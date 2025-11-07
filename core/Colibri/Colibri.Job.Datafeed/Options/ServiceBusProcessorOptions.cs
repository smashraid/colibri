namespace Colibri.Job.Datafeed.Options;

public class ServiceBusOptions
{
    public bool AutoCompleteMessages { get; set; } = false;
    public int MaxConcurrentCalls { get; set; } = 1;
    public int PrefetchCount { get; set; } = 0;
    public int MaxAutoLockRenewalDurationMinutes { get; set; } = 30;
    public string ReceiveMode { get; set; } = "PeekLock"; // PeekLock or ReceiveAndDelete
}