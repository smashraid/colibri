using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace Colibri.Job.Datafeed.Services;

/// <summary>
/// Generates cache keys by replacing template placeholders with record values
/// Uses regex for simple and fast placeholder replacement
/// </summary>
public class CacheKeyGenerator : ICacheKeyGenerator
{
    private readonly ILogger<CacheKeyGenerator> _logger;
    private static readonly Regex PlaceholderRegex = new Regex(@"\$(\w+)\$", RegexOptions.Compiled);

    public CacheKeyGenerator(ILogger<CacheKeyGenerator> logger)
    {
        _logger = logger;
    }

    public string GenerateKey(string template, Dictionary<string, object> record)
    {
        if (string.IsNullOrWhiteSpace(template))
        {
            throw new ArgumentException("Template cannot be null or empty", nameof(template));
        }

        if (record == null || record.Count == 0)
        {
            throw new ArgumentException("Record cannot be null or empty", nameof(record));
        }

        try
        {
            var result = PlaceholderRegex.Replace(template, match =>
            {
                var fieldName = match.Groups[1].Value;

                // Try exact match first
                if (record.TryGetValue(fieldName, out var value))
                {
                    return value?.ToString() ?? string.Empty;
                }

                // Try case-insensitive match
                var caseInsensitiveKey = record.Keys
                    .FirstOrDefault(k => k.Equals(fieldName, StringComparison.OrdinalIgnoreCase));

                if (caseInsensitiveKey != null)
                {
                    return record[caseInsensitiveKey]?.ToString() ?? string.Empty;
                }

                // Field not found - log warning and return empty
                _logger.LogWarning(
                    "Placeholder field '{FieldName}' not found in record. Available fields: {Fields}",
                    fieldName,
                    string.Join(", ", record.Keys));

                return string.Empty;
            });

            _logger.LogDebug("Generated cache key: {CacheKey} from template: {Template}",
                result, template);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating cache key from template: {Template}", template);
            throw;
        }
    }
}