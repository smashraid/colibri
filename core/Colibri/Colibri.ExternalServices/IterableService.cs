using Colibri.ExternalServices.Contracts;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using Colibri.Shared;
using System.Text.Json;
using Newtonsoft.Json;
using System.Net.Http.Headers;

namespace Colibri.ExternalServices
{
    public class IterableService : IIterableService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly JsonSerializerOptions _options;
        private readonly ILogger<IterableService> _logger;

        internal const string HttpClientName = "IterableHttpClient";
        public HttpClient GetHttpClient() => _httpClientFactory.CreateClient(HttpClientName);

        public IterableService(IHttpClientFactory httpClientFactory
                         , ILogger<IterableService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            _logger = logger;
        }

        private async Task<TResponse?> SendPost<TResponse, TRequest>(string url, TRequest request, string project)
        {
            var httpClient = GetHttpClient();
            httpClient.BaseAddress = new Uri("https://api.iterable.com/api/");
            httpClient.DefaultRequestHeaders.Add("Api-Key", "aa91f8f4bd87475a95761d7db3bf0b0c");
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            var httpResponseMessage = await httpClient.PostAsJsonAsync($"{url}", request);
            var response = await httpResponseMessage.Content.ReadFromJsonAsync<TResponse>(_options);
            _logger.LogWithContext(
                () => _logger.LogInformation("Iterable Api {@Endpoint}", url),
                new KeyValuePair<string, object>("Request", System.Text.Json.JsonSerializer.Serialize(request)),
                new KeyValuePair<string, object>("Response", System.Text.Json.JsonSerializer.Serialize(response)),
                new KeyValuePair<string, object>("Url", httpClient.BaseAddress?.AbsoluteUri ?? string.Empty));
            httpResponseMessage.EnsureSuccessStatusCode();
            return response;
        }

        private async Task<TResponse?> SendGet<TResponse>(string url)
        {
            var httpClient = GetHttpClient();
            string response = await httpClient.GetStringAsync($"{url}");
            var result = JsonConvert.DeserializeObject<TResponse>(response);

            _logger.LogWithContext(
               () => _logger.LogInformation("Iterable Api {@Endpoint}", url),
               new KeyValuePair<string, object>("Response", JsonConvert.SerializeObject(response)),
               new KeyValuePair<string, object>("Url", httpClient.BaseAddress?.AbsoluteUri ?? string.Empty));
            return result;
        }

        private async Task<TResponse?> SendDelete<TResponse>(string url)
        {
            var httpClient = GetHttpClient();
            var httpResponseMessage = await httpClient.DeleteAsync($"{url}");
            var response = await httpResponseMessage.Content.ReadFromJsonAsync<TResponse>(_options);
            _logger.LogWithContext(
               () => _logger.LogInformation("Iterable Api {@Endpoint}", url),
               new KeyValuePair<string, object>("Response", JsonConvert.SerializeObject(response)),
               new KeyValuePair<string, object>("Url", httpClient.BaseAddress?.AbsoluteUri ?? string.Empty));
            httpResponseMessage.EnsureSuccessStatusCode();
            return response;
        }

        public async Task<CreateCampaginResponse?> CreateCampagin(CreateCampaignRequest request)
        {
            return await SendPost<CreateCampaginResponse, CreateCampaignRequest>("campaigns/create", request, "");
        }

        public async Task<StaticListResponse?> CreateStaticList(StaticListRequest request)
        {
            return await SendPost<StaticListResponse, StaticListRequest>("lists", request, "");
        }

        public async Task<SubscriberListResponse?> CreateSubscriberList(SubscriberListRequest request)
        {
            return await SendPost<SubscriberListResponse, SubscriberListRequest>("lists/subscribe", request, "");
        }

        public async Task<string[]?> GetListUsers(long id, bool preferUserId)
        {
            string url = $"lists/getUsers?listId={id}&preferUserId={preferUserId.ToString().ToLower()}";
            var httpClient = GetHttpClient();
            httpClient.BaseAddress = new Uri("https://api.iterable.com/api/");
            httpClient.DefaultRequestHeaders.Add("Api-Key", "aa91f8f4bd87475a95761d7db3bf0b0c");
            string response = await httpClient.GetStringAsync(url);
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
