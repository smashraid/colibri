using System;
using Colibri.Job.Datafeed.Models;

namespace Colibri.Job.Datafeed.Services;

public interface IDatabaseService
{
    Task<List<Dictionary<string, object>>> ExecuteQueryAsync(
        ApiEndpoint endpoint,
        Dictionary<string, object>? parameters = null,
        CancellationToken cancellationToken = default);
}
