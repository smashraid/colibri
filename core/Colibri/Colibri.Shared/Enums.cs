namespace Colibri.Shared
{
    public enum CampaignStatus
    {
        Creating,
        GeneratingList,
        GeneratingCampaign,
        AddingSubscribers,
        Complete,
        Error
    }

    public enum CampaignType
    {
        Blast,
        Triggered
    }

    public enum CampaignState
    {
        Draft,
        Ready,
        Scheduled,
        Running,
        Finished,
        Starting,
        Aborted,
        Recurring
    }

    public enum ListType
    {
        Standard,
        Dynamic,
        Suppression,
        Internal
    }

    public enum TemplateType
    {
        Base,
        Blast,
        Triggered,
        Workflow
    }

    public enum MessageMedium
    {
        Email,
        Push,
        InApp,
        SMS
    }
}
