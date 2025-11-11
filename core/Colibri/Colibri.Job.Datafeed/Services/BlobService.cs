using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using Colibri.Job.Datafeed.Services;
using Microsoft.Extensions.Logging;

namespace Colibri.Job.Datafeed.Services;

public class BlobService : IBlobService
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly ILogger<BlobService> _logger;

    public BlobService(BlobServiceClient blobServiceClient, ILogger<BlobService> logger)
    {
        _blobServiceClient = blobServiceClient;
        _logger = logger;
    }

    public async Task<Stream> DownloadBlobAsync(string blobUrl, CancellationToken cancellationToken = default)
    {
        try
        {
            var (containerName, blobName) = ParseBlobUrl(blobUrl);

            var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
            var blobClient = containerClient.GetBlobClient(blobName);

            if (!await blobClient.ExistsAsync(cancellationToken))
            {
                throw new FileNotFoundException($"Blob not found: {blobUrl}");
            }

            var response = await blobClient.DownloadAsync(cancellationToken);

            // Create a MemoryStream to avoid disposing the network stream
            var memoryStream = new MemoryStream();
            await response.Value.Content.CopyToAsync(memoryStream, cancellationToken);
            memoryStream.Position = 0;

            _logger.LogInformation("Successfully downloaded blob: {BlobUrl}", blobUrl);
            return memoryStream;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading blob from {BlobUrl}", blobUrl);
            throw;
        }
    }

    public async Task<string> DownloadBlobAsStringAsync(string blobUrl, CancellationToken cancellationToken = default)
    {
        using var stream = await DownloadBlobAsync(blobUrl, cancellationToken);
        using var reader = new StreamReader(stream);
        return await reader.ReadToEndAsync();
    }

    public async Task<byte[]> DownloadBlobAsBytesAsync(string blobUrl, CancellationToken cancellationToken = default)
    {
        using var stream = await DownloadBlobAsync(blobUrl, cancellationToken);
        using var memoryStream = new MemoryStream();
        await stream.CopyToAsync(memoryStream, cancellationToken);
        return memoryStream.ToArray();
    }

    public async Task<bool> BlobExistsAsync(string blobUrl, CancellationToken cancellationToken = default)
    {
        try
        {
            var (containerName, blobName) = ParseBlobUrl(blobUrl);

            var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
            var blobClient = containerClient.GetBlobClient(blobName);

            return await blobClient.ExistsAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking blob existence: {BlobUrl}", blobUrl);
            return false;
        }
    }

    public async Task<long> GetBlobSizeAsync(string blobUrl, CancellationToken cancellationToken = default)
    {
        try
        {
            var (containerName, blobName) = ParseBlobUrl(blobUrl);

            var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
            var blobClient = containerClient.GetBlobClient(blobName);

            var properties = await blobClient.GetPropertiesAsync(cancellationToken: cancellationToken);
            return properties.Value.ContentLength;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting blob size: {BlobUrl}", blobUrl);
            throw;
        }
    }

    public Task<string> GetBlobFileNameAsync(string blobUrl)
    {
        var (_, blobName) = ParseBlobUrl(blobUrl);
        return Task.FromResult(Path.GetFileName(blobName));
    }

    private (string containerName, string blobName) ParseBlobUrl(string blobUrl)
    {
        try
        {
            var uri = new Uri(blobUrl);
            var segments = uri.Segments;

            if (segments.Length < 3)
            {
                throw new ArgumentException($"Invalid blob URL format: {blobUrl}");
            }

            var containerName = segments[1].Trim('/');
            var blobName = string.Join("", segments.Skip(2)).Trim('/');

            return (containerName, blobName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing blob URL: {BlobUrl}", blobUrl);
            throw new ArgumentException($"Invalid blob URL format: {blobUrl}", ex);
        }
    }
}