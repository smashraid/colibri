using Colibri.ExternalServices.Contracts;

namespace Colibri.ExternalServices
{
    public interface IIterableService
    {
        Task<string[]?> GetListUsers(long id, bool preferUserId, string token);
        Task<CreateCampaginResponse?> CreateCampagin(CreateCampaignRequest request, string token);
        Task<StaticListResponse?> CreateStaticList(StaticListRequest request, string token);
        Task<SubscriberListResponse?> CreateSubscriberList(SubscriberListRequest request, string token);
    }
}
