using Colibri.Shared.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Colibri.ExternalServices
{
    public interface IDigitalCommunicationService
    {
        Task<CampaignListCreateViewModel?> PostCampaignListDb(CampaignListCreateViewModel request, int campaignId);
    }
}
