using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Colibri.ExternalServices
{
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
