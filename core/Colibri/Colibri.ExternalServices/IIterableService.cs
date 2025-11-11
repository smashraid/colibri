using Colibri.ExternalServices.Contracts;

namespace Colibri.ExternalServices
{
    public interface IIterableService
    {
        Task<string[]?> GetListUsers(long id, bool preferUserId, string token, CancellationToken cancellationToken = default);
        Task<CreateCampaginResponse?> CreateCampagin(CreateCampaignRequest request, string token, CancellationToken cancellationToken = default);
        Task<StaticListResponse?> CreateStaticList(StaticListRequest request, string token, CancellationToken cancellationToken = default);
        Task<SubscriberListResponse?> CreateSubscriberList(SubscriberListRequest request, string token, CancellationToken cancellationToken = default);
        Task<ErrorResponse?> UpdateUserAsync(UserUpdateRequest request, string token, CancellationToken cancellationToken);
    }
}
