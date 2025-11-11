# Architecture Documentation

## Overview

This refactored system processes CSV records and enriches them with data from multiple sources (CSV, Database, API) before updating Iterable user profiles. The architecture follows SOLID principles with proper separation of concerns.

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Azure Service Bus                           │
│                  (DataSourceConfiguration)                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│          AzureMessageProcessingService (Background)             │
│  - Receives messages continuously                               │
│  - Validates configuration                                      │
│  - Handles errors and retries                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              AzureMessageProcessor                              │
│  1. Check Azure Table Storage for cache refresh status          │
│  2. Pre-cache CSV/Database sources if needed                    │
│  3. Delegate to CsvProcessor                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
     ┌───────────────┴──────────────┐
     │                              │
     ▼                              ▼
┌─────────────────┐      ┌──────────────────────┐
│  Table Storage  │      │   Blob Storage       │
│  Check Status   │      │   Download Files     │
└─────────────────┘      └──────────────────────┘
     │                              │
     └───────────────┬──────────────┘
                     ▼
┌────────────────────────────────────────────────────────────────┐
│                    CsvProcessor                                │
│  1. Read main CSV (NOT cached - one-time read)                 │
│  2. Process each record:                                       │
│     - Get CSV data (from cache using composite key)            │
│     - Get Database data (from cache using parameters)          │
│     - Get API data (call API with cache)                       │
│  3. Enrich record with all data sources                        │
│  4. Update Iterable user profile                               │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Iterable API                                   │
│            (Update User Profiles)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Caching Strategy

### Three Types of Data

#### 1. **Main CSV File (Input)**

- **NOT CACHED** - Read once per message
- Contains records to process (e.g., user emails)
- Each row is processed individually

#### 2. **CSV/Database Data Sources (Lookup)**

- **CACHED** with composite keys
- Checked before processing main CSV
- Refreshed based on Azure Table Storage flag
- Example: Sales data by zip code + year

#### 3. **API Data Sources (Dynamic)**

- **CACHED** per API call
- Cache key from parameters
- Cached on-demand during processing
- Example: User profile by email

---

## Azure Table Storage Integration

### Table Schema

```
PartitionKey | RowKey           | NeedRefresh | LastRefreshed
-------------|------------------|-------------|-------------------
CSV          | PlanGeoGeneral   | true        | 2025-10-17 15:00:30Z
API          | UserProfile      | false       | 2025-10-17 16:00:30Z
Database     | ProductPricing   | true        | 2025-10-17 15:20:30Z
```

### Usage Flow

1. **Check Status**: Before processing, check if `NeedRefresh = true`
2. **Load Data**: If refresh needed, download and cache data source
3. **Update Status**: Set `NeedRefresh = false` and update `LastRefreshed`
4. **Manual Control**: Update flags via Azure Portal when source data changes

---

## Service Responsibilities

### **TableStorageService**

- Get data source status from Azure Table
- Check if cache refresh is needed
- Update last refreshed timestamp

### **BlobService**

- Download files from Azure Blob Storage
- Support for CSV files with cancellation
- Proper stream handling

### **DataSourceCacheService**

- Cache lookup data (CSV/Database)
- Use composite keys for lookups
- Track cache metadata

### **MemoryCacheService**

- Low-level caching (API calls, simple data)
- Single-key lookups
- Thread-safe with SemaphoreSlim

### **CsvProcessor**

- Read main CSV from blob
- Orchestrate data enrichment
- Call data sources (CSV, DB, API)
- Update Iterable users
- Track statistics

### **AzureMessageProcessor**

- Pre-cache CSV/Database sources
- Check Table Storage status
- Coordinate data loading

---

## Key Features

### ✅ **Cancellation Token Support**

All async methods support cancellation for graceful shutdown:

```csharp
await _csvProcessor.ProcessCsvFileAsync(configuration, cancellationToken);
```

### ✅ **Dynamic Configuration**

Everything driven by `DataSourceConfiguration`:

- CSV columns and types
- API endpoints and authentication
- Cache durations
- Composite keys

### ✅ **Cache Refresh Control**

Azure Table Storage provides manual control:

- Set `NeedRefresh = true` when source data changes
- System automatically updates after refresh
- No need to restart the application

### ✅ **Error Handling**

- Message validation before processing
- Retry logic for APIs
- Dead letter queue for failures
- Detailed logging with correlation IDs

### ✅ **Performance Tracking**

Statistics logged per batch:

- Cache hit rate
- API failures
- Processing progress
- Batch success rate

---

## Configuration Example

### appsettings.json

```json
{
  "ProcessingConfiguration": {
    "MaxConcurrentBatches": 20,
    "BatchSize": 50,
    "DelayBetweenBatchesMs": 100
  },
  "Azure": {
    "ServiceBus": {
      "Name": "CsvBus",
      "ConnectionString": "Endpoint=sb://...",
      "Topic": "csv-processor",
      "Subscription": "default"
    },
    "Storage": {
      "TableName": "DataSources",
      "ConnectionString": "DefaultEndpointsProtocol=https;..."
    }
  }
}
```

---

## Message Format Example

### Scenario: Enrich users with sales data and profile info

```json
{
  "CsvConfiguration": {
    "FilePath": "https://digitalcommunication.blob.core.windows.net/datafeeds/projects/sandbox.csv",
    "HasHeader": true,
    "Columns": [
      {
        "Name": "email",
        "Type": "string",
        "Required": true
      },
      {
        "Name": "agentEmailAddress",
        "Type": "string",
        "Required": false
      },
      {
        "Name": "website",
        "Type": "string",
        "Required": true
      },
      {
        "Name": "zipCode",
        "Type": "string",
        "Required": false
      },
      {
        "Name": "year",
        "Type": "int",
        "Required": true
      }
    ]
  },
  "ApiEndpoints": {
    "Datasources": [
      {
        "SourceType": "CSV",
        "Name": "PlanGeoGeneral",
        "FilePath": "https://digitalcommunication.blob.core.windows.net/datafeeds/datasources/plan_geo_general.csv",
        "HasHeader": true,
        "CompositeKey": ["year", "zipCode"],
        "CompositeKeyMapping": {
          "zipCode": "zip"
        },
        "Columns": [
          {
            "Name": "state",
            "Type": "string"
          },
          {
            "Name": "county",
            "Type": "string"
          },
          {
            "Name": "zip",
            "Type": "string"
          },
          {
            "Name": "has_dsnp",
            "Type": "bool"
          },
          {
            "Name": "has_csnp",
            "Type": "bool"
          },
          {
            "Name": "has_nosnp",
            "Type": "bool"
          },
          {
            "Name": "min_plan_premium",
            "Type": "double"
          },
          {
            "Name": "zero_or_low_monthly_plan_premiums",
            "Type": "string"
          },
          {
            "Name": "min_deductible",
            "Type": "int"
          },
          {
            "Name": "zero_deductibles",
            "Type": "string"
          },
          {
            "Name": "zero_copay_amount_present",
            "Type": "bool"
          },
          {
            "Name": "zero_pcp_copay_present",
            "Type": "bool"
          },
          {
            "Name": "pcp_copay_amount",
            "Type": "int"
          },
          {
            "Name": "specialist_visit_copay_amount",
            "Type": "int"
          },
          {
            "Name": "zero_specialist_visit_copay",
            "Type": "string"
          },
          {
            "Name": "benefit_categories_offered",
            "Type": "string"
          },
          {
            "Name": "vision_benefit_standard",
            "Type": "string"
          },
          {
            "Name": "vision_benefit_amount",
            "Type": "int"
          },
          {
            "Name": "vision_copay_amount",
            "Type": "int"
          },
          {
            "Name": "dental_benefit_standard",
            "Type": "string"
          },
          {
            "Name": "dental_benefit_amount",
            "Type": "int"
          },
          {
            "Name": "dental_copay_amount",
            "Type": "int"
          },
          {
            "Name": "hearing_benefit_standard",
            "Type": "string"
          },
          {
            "Name": "hearing_benefit_amount",
            "Type": "int"
          },
          {
            "Name": "hearing_copay_amount",
            "Type": "int"
          },
          {
            "Name": "fitness_program_name",
            "Type": "string"
          },
          {
            "Name": "wellness_program_name",
            "Type": "string"
          },
          {
            "Name": "grocery_allowance",
            "Type": "bool"
          },
          {
            "Name": "otc_amount",
            "Type": "int"
          },
          {
            "Name": "nurseline",
            "Type": "bool"
          },
          {
            "Name": "fitness_programs",
            "Type": "bool"
          },
          {
            "Name": "silver_sneakers",
            "Type": "bool"
          },
          {
            "Name": "has_fitness_programs",
            "Type": "bool"
          },
          {
            "Name": "has_transportation_services",
            "Type": "bool"
          },
          {
            "Name": "has_flex_card_main",
            "Type": "bool"
          },
          {
            "Name": "extra_benefits_card_aetna",
            "Type": "bool"
          },
          {
            "Name": "healthy_food_card_kaiser",
            "Type": "bool"
          },
          {
            "Name": "food_home_card_devoted_health",
            "Type": "bool"
          },
          {
            "Name": "flex_card_florida_blue_hmo",
            "Type": "bool"
          },
          {
            "Name": "flexible_benefit_card_medi_gold",
            "Type": "bool"
          },
          {
            "Name": "card_molina_healthcare",
            "Type": "bool"
          },
          {
            "Name": "priority_flex_card_priority_health_medicare",
            "Type": "bool"
          },
          {
            "Name": "flexible_benefit_card_saint_alphonsus_health_plan",
            "Type": "bool"
          },
          {
            "Name": "flexible_benefit_card_trinity_health_planof_michigan",
            "Type": "bool"
          },
          {
            "Name": "debit_card_zing_health",
            "Type": "bool"
          },
          {
            "Name": "wellcare_spendables_card_wellcare",
            "Type": "bool"
          },
          {
            "Name": "has_otc_allowance",
            "Type": "bool"
          },
          {
            "Name": "period_otc_monthly",
            "Type": "bool"
          },
          {
            "Name": "period_otc_quarterly",
            "Type": "bool"
          },
          {
            "Name": "period_otc_yearly",
            "Type": "bool"
          },
          {
            "Name": "has_general_pre_paid_card",
            "Type": "bool"
          },
          {
            "Name": "pre_paid_card",
            "Type": "bool"
          },
          {
            "Name": "dental_pre_paid_card",
            "Type": "bool"
          },
          {
            "Name": "vision_pre_paid_card",
            "Type": "bool"
          },
          {
            "Name": "hearing_pre_paid_card",
            "Type": "bool"
          },
          {
            "Name": "essential_extras_elv",
            "Type": "bool"
          },
          {
            "Name": "utility_allowance",
            "Type": "bool"
          },
          {
            "Name": "assistive_devices_allowance",
            "Type": "bool"
          },
          {
            "Name": "health_allowance",
            "Type": "bool"
          },
          {
            "Name": "has_zero_deductibles",
            "Type": "bool"
          },
          {
            "Name": "has_zero_primary_care_copay",
            "Type": "bool"
          },
          {
            "Name": "has_zero_specialist_visit_copay",
            "Type": "bool"
          },
          {
            "Name": "has_zero_for_many_prescription_drugs",
            "Type": "bool"
          },
          {
            "Name": "dental_copay_min",
            "Type": "int"
          },
          {
            "Name": "vision_copay_min",
            "Type": "int"
          },
          {
            "Name": "hearing_copay_min",
            "Type": "int"
          },
          {
            "Name": "transportation_copay_min",
            "Type": "int"
          },
          {
            "Name": "has_zero_copay_general",
            "Type": "bool"
          },
          {
            "Name": "chiropractic_services",
            "Type": "bool"
          },
          {
            "Name": "outpatient_mental_health_care",
            "Type": "bool"
          },
          {
            "Name": "durable_medical_equipment",
            "Type": "bool"
          },
          {
            "Name": "acupuncture",
            "Type": "bool"
          },
          {
            "Name": "telehealth",
            "Type": "bool"
          },
          {
            "Name": "meal_delivery",
            "Type": "bool"
          },
          {
            "Name": "year",
            "Type": "int"
          },
          {
            "Name": "dental_details",
            "Type": "string"
          },
          {
            "Name": "hearing_details",
            "Type": "string"
          },
          {
            "Name": "vision_details",
            "Type": "string"
          },
          {
            "Name": "dental_benefit_offered",
            "Type": "bool"
          },
          {
            "Name": "hearing_benefit_offered",
            "Type": "bool"
          },
          {
            "Name": "vision_benefit_offered",
            "Type": "bool"
          }
        ],
        "CacheDurationMinutes": 60,
        "UseNestedObject": true
      },
      {
        "SourceType": "API",
        "Name": "UserProfile",
        "Method": "GET",
        "Url": "https://api.service.com/users/{email}",
        "AuthenticationHeader": "Authorization",
        "AuthenticationToken": "Bearer token_here",
        "TimeoutSeconds": 30,
        "RetryCount": 3,
        "ExpectedStatusCode": 200,
        "CacheKeyParameters": ["email"],
        "CacheDurationMinutes": 60
      },
      {
        "SourceType": "Database",
        "Name": "ProductPricing",
        "DatabaseType": "PostgreSQL",
        "ConnectionString": "Host=myserver.postgres.database.azure.com;Database=Products;Username=user;Password=pass;SSL Mode=Require;",
        "Query": "SELECT * FROM product_pricing WHERE active = true",
        "CompositeKey": ["product_id", "region_code"],
        "CompositeKeyMapping": {
          "productId": "product_id",
          "regionCode": "region_code"
        },
        "Columns": [
          {
            "Name": "product_id",
            "Type": "int"
          },
          {
            "Name": "region_code",
            "Type": "string"
          },
          {
            "Name": "price",
            "Type": "decimal"
          },
          {
            "Name": "currency",
            "Type": "string"
          }
        ],
        "CacheDurationMinutes": 60,
        "UseNestedObject": true
      }
    ]
  }
}
```

---

## Benefits of This Architecture

### 🚀 **Performance**

- CSV/Database data loaded once and cached
- Concurrent batch processing
- API response caching reduces load

### 🔧 **Maintainability**

- Clear separation of concerns
- Easy to add new data source types
- Configuration-driven behavior

### 📊 **Observability**

- Detailed logging with Serilog
- Statistics tracking
- Correlation IDs for tracing

### 🛡️ **Reliability**

- Graceful cancellation
- Retry logic for APIs
- Dead letter queue for failures
- Proper resource disposal

### 🎯 **Flexibility**

- Dynamic data sources
- Manual cache control
- Easy to extend with new source types

---

## Next Steps / TODO

1. **Implement Database Service**

   - Add `IDatabaseService` interface
   - Support parameterized queries
   - Connection pooling

2. **Enhanced Monitoring**

   - Application Insights integration
   - Custom metrics for cache performance
   - Alert on high failure rates

3. **Advanced Caching**

   - Redis for distributed caching
   - Cache warming strategies
   - Intelligent cache invalidation

4. **Testing**
   - Unit tests for all services
   - Integration tests with test containers
   - Load testing for performance validation

---

## Summary

This architecture provides a robust, scalable solution for enriching user data from multiple sources. The use of:

- **IMessageProcessor pattern** for clean message handling
- **Azure Table Storage** for cache control
- **Composite key caching** for efficient lookups
- **Cancellation tokens** for graceful shutdown
- **Dynamic configuration** for flexibility

Makes it production-ready and easy to maintain and extend.
