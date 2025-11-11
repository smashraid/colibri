using System;

namespace Colibri.Job.Datafeed.Services;

public interface IBlobService
{
    Task<Stream> DownloadBlobAsync(string blobUrl, CancellationToken cancellationToken = default);
    Task<string> DownloadBlobAsStringAsync(string blobUrl, CancellationToken cancellationToken = default);
    Task<byte[]> DownloadBlobAsBytesAsync(string blobUrl, CancellationToken cancellationToken = default);
    Task<bool> BlobExistsAsync(string blobUrl, CancellationToken cancellationToken = default);
    Task<string> GetBlobFileNameAsync(string blobUrl);
    Task<long> GetBlobSizeAsync(string blobUrl, CancellationToken cancellationToken = default);
}
