using Colibri.ExternalServices.Options;
using Colibri.Shared;
using Colibri.Shared.Models;
using Colibri.Shared.ViewModels;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace Colibri.ExternalServices
{
    public class DigitalCommunicationService : IDigitalCommunicationService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly JsonSerializerOptions _options;
        private readonly ILogger<DigitalCommunicationService> _logger;
        private readonly DigitalCommunicationOptions _digitalCommunicationOptions;

        internal const string HttpClientName = "DigitalCommunicationHttpClient";
        private HttpClient GetHttpClient()
        {
            var httpClient = _httpClientFactory.CreateClient(HttpClientName);
            httpClient.BaseAddress = new Uri(_digitalCommunicationOptions.Url);
            httpClient.DefaultRequestHeaders.Add(_digitalCommunicationOptions.TokenHeaderKey, _digitalCommunicationOptions.Token);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return httpClient;
        }

        public DigitalCommunicationService(IHttpClientFactory httpClientFactory
                         , IOptions<DigitalCommunicationOptions> digitalCommunicationOptions
                         , ILogger<DigitalCommunicationService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            _digitalCommunicationOptions = digitalCommunicationOptions.Value;
            _logger = logger;
        }

        private async Task<TResponse?> SendPost<TResponse, TRequest>(string url, TRequest request)
        {
            var httpClient = GetHttpClient();
            var httpResponseMessage = await httpClient.PostAsJsonAsync($"{url}", request);
            var response = await httpResponseMessage.Content.ReadFromJsonAsync<TResponse>(_options);
            _logger.LogWithContext(
                () => _logger.LogInformation("DigitalCommunication Api {@Endpoint}", url),
                new KeyValuePair<string, object>("Request", System.Text.Json.JsonSerializer.Serialize(request)),
                new KeyValuePair<string, object>("Response", System.Text.Json.JsonSerializer.Serialize(response)),
                new KeyValuePair<string, object>("Url", httpClient.BaseAddress?.AbsoluteUri ?? string.Empty));
            httpResponseMessage.EnsureSuccessStatusCode();
            return response;
        }

        private async Task SendUpdate<TRequest>(string url, TRequest request)
        {
            var httpClient = GetHttpClient();
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            var httpResponseMessage = await httpClient.PutAsJsonAsync($"{url}", request);
            var response = await httpResponseMessage.Content.ReadAsStringAsync();
            _logger.LogWithContext(
                () => _logger.LogInformation("DigitalCommunication Api {@Endpoint}", url),
                new KeyValuePair<string, object>("Request", System.Text.Json.JsonSerializer.Serialize(request)),
                new KeyValuePair<string, object>("Response", System.Text.Json.JsonSerializer.Serialize(response)),
                new KeyValuePair<string, object>("Url", httpClient.BaseAddress?.AbsoluteUri ?? string.Empty));
            httpResponseMessage.EnsureSuccessStatusCode();
        }

        private async Task<TResponse?> SendGet<TResponse>(string url)
        {
            var httpClient = GetHttpClient();
            string response = await httpClient.GetStringAsync($"{url}");
            var result = JsonConvert.DeserializeObject<TResponse>(response);

            _logger.LogWithContext(
               () => _logger.LogInformation("DigitalCommunication Api {@Endpoint}", url),
               new KeyValuePair<string, object>("Response", JsonConvert.SerializeObject(response)),
               new KeyValuePair<string, object>("Url", httpClient.BaseAddress?.AbsoluteUri ?? string.Empty));
            return result;
        }

        public async Task<CampaignListCreateViewModel?> PostCampaignListDb(CampaignListCreateViewModel request, int campaignId)
        {
            return await SendPost<CampaignListCreateViewModel, CampaignListCreateViewModel>($"database/postListDb?campaignId={campaignId}", request);
        }

        public async Task PutCampaignDb(int id, CampaignUpdateViewModel request)
        {
            await SendUpdate($"database/putCampaignDb/{id}", request);
        }

        public async Task<Project?> GetProjectDb(int id)
        {
            return await SendGet<Project>($"getProjectDb/{id}");
        }
    }
}
