using Colibri.ExternalServices.Contracts;

namespace Colibri.ExternalServices
{
    public interface IIterableService
    {
        Task<string[]?> GetListUsers(long id, bool preferUserId);
        Task<CreateCampaginResponse?> CreateCampagin(CreateCampaignRequest request);
        Task<StaticListResponse?> CreateStaticList(StaticListRequest request);
        Task<SubscriberListResponse?> CreateSubscriberList(SubscriberListRequest request);
    }
}
