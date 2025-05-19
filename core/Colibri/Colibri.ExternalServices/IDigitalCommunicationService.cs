using Colibri.Shared.Models;
using Colibri.Shared.ViewModels;

namespace Colibri.ExternalServices
{
    public interface IDigitalCommunicationService
    {
        Task<CampaignListCreateViewModel?> PostCampaignListDb(CampaignListCreateViewModel request, int campaignId);
        Task PutCampaignDb(int id, CampaignUpdateViewModel campaign);
        Task<Project?> GetProjectDb(int id);
    }
}
