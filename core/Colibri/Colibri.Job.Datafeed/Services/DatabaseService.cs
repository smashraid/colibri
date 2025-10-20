using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Colibri.Job.Datafeed.Models;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Colibri.Job.Datafeed.Services;

public class DatabaseService : IDatabaseService
{
    private readonly ILogger<DatabaseService> _logger;

    public DatabaseService(ILogger<DatabaseService> logger)
    {
        _logger = logger;
    }

    public async Task<List<Dictionary<string, object>>> ExecuteQueryAsync(
        ApiEndpoint endpoint,
        Dictionary<string, object>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(endpoint.ConnectionString))
        {
            throw new ArgumentException("ConnectionString is required for database datasource");
        }

        if (string.IsNullOrWhiteSpace(endpoint.Query))
        {
            throw new ArgumentException("Query is required for database datasource");
        }

        try
        {
            using var connection = CreateConnection(endpoint.DatabaseType, endpoint.ConnectionString);

            await connection.OpenAsync(cancellationToken);

            // Determine command type
            var commandType = endpoint.CommandType?.ToLower() == "storedprocedure"
                ? CommandType.StoredProcedure
                : CommandType.Text;

            _logger.LogDebug("Executing {CommandType} query for {EndpointName}: {Query}",
                commandType, endpoint.Name, endpoint.Query);

            // Build parameters
            var dbParameters = BuildParameters(parameters, endpoint);

            // Execute query with timeout
            var commandDefinition = new CommandDefinition(
                commandText: endpoint.Query,
                parameters: dbParameters,
                commandType: commandType,
                commandTimeout: endpoint.TimeoutSeconds,
                cancellationToken: cancellationToken
            );

            // Execute and get results as dynamic
            var results = await connection.QueryAsync(commandDefinition);

            // Convert to Dictionary<string, object>
            var resultList = new List<Dictionary<string, object>>();

            foreach (var row in results)
            {
                var dict = new Dictionary<string, object>();
                var dynamicRow = (IDictionary<string, object>)row;

                foreach (var kvp in dynamicRow)
                {
                    dict[kvp.Key] = kvp.Value ?? DBNull.Value;
                }

                resultList.Add(dict);
            }

            _logger.LogInformation("Successfully executed query for {EndpointName}, returned {Count} rows",
                endpoint.Name, resultList.Count);

            return resultList;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Database query cancelled for {EndpointName}", endpoint.Name);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing database query for {EndpointName}: {Query}",
                endpoint.Name, endpoint.Query);
            throw;
        }
    }

    private DbConnection CreateConnection(string? databaseType, string connectionString)
    {
        return databaseType?.ToLower() switch
        {
            "sqlserver" or "mssql" => new SqlConnection(connectionString),
            "postgresql" or "postgres" => new NpgsqlConnection(connectionString),
            // Add more database types as needed
            // "mysql" => new MySqlConnection(connectionString),
            _ => throw new NotSupportedException($"Database type '{databaseType}' is not supported. Supported types: SqlServer, PostgreSQL")
        };
    }

    private DynamicParameters BuildParameters(Dictionary<string, object>? inputParameters, ApiEndpoint endpoint)
    {
        var dbParams = new DynamicParameters();

        if (inputParameters == null || !inputParameters.Any())
        {
            return dbParams;
        }

        foreach (var param in inputParameters)
        {
            // Handle different data types appropriately
            var value = ConvertParameterValue(param.Value);

            dbParams.Add($"@{param.Key}", value);

            _logger.LogTrace("Added parameter @{ParamName} = {ParamValue}", param.Key, value);
        }

        return dbParams;
    }

    private object? ConvertParameterValue(object value)
    {
        if (value == null || value == DBNull.Value)
        {
            return DBNull.Value;
        }

        // Handle different types
        return value switch
        {
            string str when string.IsNullOrWhiteSpace(str) => DBNull.Value,
            DateTime dt => dt,
            DateTimeOffset dto => dto,
            bool b => b,
            int i => i,
            long l => l,
            decimal d => d,
            double db => db,
            float f => f,
            _ => value.ToString()
        };
    }
}