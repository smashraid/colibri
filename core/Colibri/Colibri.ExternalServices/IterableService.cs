using Colibri.ExternalServices.Contracts;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using Colibri.Shared;
using System.Text.Json;
using Newtonsoft.Json;
using System.Net.Http.Headers;
using Colibri.ExternalServices.Options;
using Microsoft.Extensions.Options;
using System.Threading;

namespace Colibri.ExternalServices
{
    public class IterableService : IIterableService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly JsonSerializerOptions _options;
        private readonly ILogger<IterableService> _logger;
        private readonly IterableOptions _iterableOptions;

        internal const string HttpClientName = "IterableHttpClient";
        private HttpClient GetHttpClient(string token)
        {
            var httpClient = _httpClientFactory.CreateClient(HttpClientName);
            httpClient.BaseAddress = new Uri(_iterableOptions.Url);
            httpClient.DefaultRequestHeaders.Add(_iterableOptions.TokenHeaderKey, token);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return httpClient;
        }

        public IterableService(IHttpClientFactory httpClientFactory
                         , IOptions<IterableOptions> iterableOptions
                         , ILogger<IterableService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            _iterableOptions = iterableOptions.Value;
            _logger = logger;
        }

        private async Task<TResponse?> SendPost<TResponse, TRequest>(string url, TRequest request, string token, CancellationToken cancellationToken)
        {
            var httpClient = GetHttpClient(token);
            var httpResponseMessage = await httpClient.PostAsJsonAsync($"{url}", request, cancellationToken);
            var response = await httpResponseMessage.Content.ReadFromJsonAsync<TResponse>(_options, cancellationToken);
            _logger.LogWithContext(
                () => _logger.LogInformation("Iterable Api {@Endpoint}", url),
                new KeyValuePair<string, object>("Request", System.Text.Json.JsonSerializer.Serialize(request)),
                new KeyValuePair<string, object>("Response", System.Text.Json.JsonSerializer.Serialize(response)),
                new KeyValuePair<string, object>("Url", httpClient.BaseAddress?.AbsoluteUri ?? string.Empty));
            httpResponseMessage.EnsureSuccessStatusCode();
            return response;
        }

        private async Task<TResponse?> SendGet<TResponse>(string url, string token, CancellationToken cancellationToken)
        {
            var httpClient = GetHttpClient(token);
            string response = await httpClient.GetStringAsync($"{url}", cancellationToken);
            var result = JsonConvert.DeserializeObject<TResponse>(response);

            _logger.LogWithContext(
               () => _logger.LogInformation("Iterable Api {@Endpoint}", url),
               new KeyValuePair<string, object>("Response", JsonConvert.SerializeObject(response)),
               new KeyValuePair<string, object>("Url", httpClient.BaseAddress?.AbsoluteUri ?? string.Empty));
            return result;
        }

        private async Task<TResponse?> SendDelete<TResponse>(string url, string token, CancellationToken cancellationToken)
        {
            var httpClient = GetHttpClient(token);
            var httpResponseMessage = await httpClient.DeleteAsync($"{url}", cancellationToken);
            var response = await httpResponseMessage.Content.ReadFromJsonAsync<TResponse>(_options);
            _logger.LogWithContext(
               () => _logger.LogInformation("Iterable Api {@Endpoint}", url),
               new KeyValuePair<string, object>("Response", JsonConvert.SerializeObject(response)),
               new KeyValuePair<string, object>("Url", httpClient.BaseAddress?.AbsoluteUri ?? string.Empty));
            httpResponseMessage.EnsureSuccessStatusCode();
            return response;
        }

        public async Task<CreateCampaginResponse?> CreateCampagin(CreateCampaignRequest request, string token, CancellationToken cancellationToken)
        {
            return await SendPost<CreateCampaginResponse, CreateCampaignRequest>("campaigns/create", request, token, cancellationToken);
        }

        public async Task<StaticListResponse?> CreateStaticList(StaticListRequest request, string token, CancellationToken cancellationToken)
        {
            return await SendPost<StaticListResponse, StaticListRequest>("lists", request, token, cancellationToken);
        }

        public async Task<SubscriberListResponse?> CreateSubscriberList(SubscriberListRequest request, string token, CancellationToken cancellationToken)
        {
            return await SendPost<SubscriberListResponse, SubscriberListRequest>("lists/subscribe", request, token, cancellationToken);
        }

        public async Task<string[]?> GetListUsers(long id, bool preferUserId, string token, CancellationToken cancellationToken)
        {
            string url = $"lists/getUsers?listId={id}&preferUserId={preferUserId.ToString().ToLower()}";
            var httpClient = GetHttpClient(token);
            string response = await httpClient.GetStringAsync(url, cancellationToken);
            var result = response.Split(
                    ["\r\n", "\r", "\n"],
                    StringSplitOptions.RemoveEmptyEntries
                );
            _logger.LogWithContext(
               () => _logger.LogInformation("Iterable Api {@Endpoint}", url),
               new KeyValuePair<string, object>("Response", JsonConvert.SerializeObject(response)),
               new KeyValuePair<string, object>("Url", httpClient.BaseAddress?.AbsoluteUri ?? string.Empty));
            return result;
        }
    }
}
