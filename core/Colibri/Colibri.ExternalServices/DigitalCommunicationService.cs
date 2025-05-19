using Colibri.Shared;
using Colibri.Shared.ViewModels;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Colibri.ExternalServices
{
    public class DigitalCommunicationService : IDigitalCommunicationService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly JsonSerializerOptions _options;
        private readonly ILogger<DigitalCommunicationService> _logger;

        internal const string HttpClientName = "DigitalCommunicationHttpClient";
        public HttpClient GetHttpClient() => _httpClientFactory.CreateClient(HttpClientName);

        public DigitalCommunicationService(IHttpClientFactory httpClientFactory
                         , ILogger<DigitalCommunicationService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            _logger = logger;
        }

        private async Task<TResponse?> SendPost<TResponse, TRequest>(string url, TRequest request)
        {
            var httpClient = GetHttpClient();
            httpClient.BaseAddress = new Uri("https://localhost:62279/api/");
            //httpClient.DefaultRequestHeaders.Add("Api-Key", "aa91f8f4bd87475a95761d7db3bf0b0c");
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
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

        public async Task<CampaignListCreateViewModel?> PostCampaignListDb(CampaignListCreateViewModel request, int campaignId)
        {
            return await SendPost<CampaignListCreateViewModel, CampaignListCreateViewModel>($"database/postListDb?campaignId={campaignId}", request);
        }
    }
}
