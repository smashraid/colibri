namespace Colibri.Job.Options
{
    public class JobOptions
    {
        public const string Path = "Job";

        public int MaxRetryAttempts { get; set; }
        public int DelayRetry { get; set; }
        public int DelayList { get; set; }
        public int DelayCampaign { get; set; }
        public int DelaySubscribers { get; set; }
        public int DelayBetweenCalls { get; set; }
        public int DelayDatabase { get; set; }
    }
}
