using System.Globalization;
using System.Text;
using System.Text.Json;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class ExportService : IExportService
{
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<ExportService> _logger;

    public ExportService(
        AppDbContext context,
        IAuditLogService auditLogService,
        ILogger<ExportService> logger)
    {
        _context = context;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    public async Task<ExportResponseDto> ExportDataAsync(ExportRequestDto request, Guid userId)
    {
        _logger.LogInformation(
            "Export requested by user {UserId}: EntityType={EntityType}, Format={Format}",
            userId, request.EntityType, request.Format);

        var entityType = request.EntityType.ToLowerInvariant();

        var (data, totalRecords) = entityType switch
        {
            "evidence" => await GetEvidenceDataAsync(request),
            "exceptions" or "exception" => await GetExceptionDataAsync(request),
            "programs" or "program" => await GetProgramDataAsync(request),
            "policies" or "policy" => await GetPolicyDataAsync(request),
            "auditlogs" or "auditlog" or "audit-logs" => await GetAuditLogDataAsync(request),
            "alerts" or "alert" => await GetAlertDataAsync(request),
            _ => throw new ArgumentException($"Unsupported entity type: {request.EntityType}")
        };

        byte[] fileData;
        string contentType;
        string fileExtension;

        if (request.Format.Equals("CSV", StringComparison.OrdinalIgnoreCase))
        {
            fileData = GenerateCsv(data);
            contentType = "text/csv";
            fileExtension = "csv";
        }
        else if (request.Format.Equals("JSON", StringComparison.OrdinalIgnoreCase))
        {
            fileData = GenerateJson(data);
            contentType = "application/json";
            fileExtension = "json";
        }
        else
        {
            throw new ArgumentException($"Unsupported format: {request.Format}");
        }

        var timestamp = DateTimeOffset.UtcNow.ToString("yyyyMMdd_HHmmss");
        var fileName = $"{request.EntityType}_{timestamp}.{fileExtension}";

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        var userEmail = user?.Email ?? "unknown";

        await _auditLogService.LogActionAsync(
            userId,
            userEmail,
            "Export",
            request.EntityType,
            null,
            new
            {
                Format = request.Format,
                TotalRecords = totalRecords,
                FileName = fileName,
                Filters = new
                {
                    request.FromDate,
                    request.ToDate,
                    request.UserId,
                    request.Action,
                    request.Page,
                    request.PageSize
                }
            });

        _logger.LogInformation(
            "Export completed: EntityType={EntityType}, Format={Format}, Records={TotalRecords}, FileName={FileName}",
            request.EntityType, request.Format, totalRecords, fileName);

        return new ExportResponseDto
        {
            FileName = fileName,
            ContentType = contentType,
            Data = fileData,
            TotalRecords = totalRecords,
            GeneratedAt = DateTimeOffset.UtcNow
        };
    }

    private async Task<(List<Dictionary<string, object?>> Data, long TotalRecords)> GetEvidenceDataAsync(ExportRequestDto request)
    {
        var query = _context.Evidence.AsNoTracking().AsQueryable();

        if (request.FromDate.HasValue)
        {
            var fromDate = request.FromDate.Value.UtcDateTime;
            query = query.Where(e => e.UploadedAt >= fromDate);
        }

        if (request.ToDate.HasValue)
        {
            var toDate = request.ToDate.Value.UtcDateTime;
            query = query.Where(e => e.UploadedAt <= toDate);
        }

        if (request.UserId.HasValue)
        {
            query = query.Where(e => e.UploadedBy == request.UserId.Value);
        }

        if (request.AdditionalFilters is not null)
        {
            if (request.AdditionalFilters.TryGetValue("status", out var status) && !string.IsNullOrWhiteSpace(status))
            {
                if (Enum.TryParse<EvidenceStatus>(status, true, out var evidenceStatus))
                {
                    query = query.Where(e => e.Status == evidenceStatus);
                }
            }

            if (request.AdditionalFilters.TryGetValue("employeeId", out var employeeId) && !string.IsNullOrWhiteSpace(employeeId))
            {
                query = query.Where(e => e.EmployeeId == employeeId);
            }
        }

        var totalRecords = await query.LongCountAsync();

        if (request.Page.HasValue && request.PageSize.HasValue)
        {
            var skip = (request.Page.Value - 1) * request.PageSize.Value;
            query = query.OrderByDescending(e => e.UploadedAt).Skip(skip).Take(request.PageSize.Value);
        }
        else
        {
            query = query.OrderByDescending(e => e.UploadedAt);
        }

        var records = await query.ToListAsync();

        var data = records.Select(e => new Dictionary<string, object?>
        {
            ["Id"] = e.Id,
            ["EmployeeId"] = e.EmployeeId,
            ["EmployeeName"] = e.EmployeeName,
            ["CourseName"] = e.CourseName,
            ["CompletionDate"] = e.CompletionDate.ToString("yyyy-MM-dd"),
            ["Score"] = e.Score,
            ["PolicyId"] = e.PolicyId,
            ["ConfidenceLevel"] = e.ConfidenceLevel.ToString(),
            ["Status"] = e.Status.ToString(),
            ["UploadedBy"] = e.UploadedBy,
            ["UploadedAt"] = e.UploadedAt.ToString("o"),
            ["ValidatedAt"] = e.ValidatedAt?.ToString("o")
        }).ToList();

        return (data, totalRecords);
    }

    private async Task<(List<Dictionary<string, object?>> Data, long TotalRecords)> GetExceptionDataAsync(ExportRequestDto request)
    {
        var query = _context.Exceptions.AsNoTracking().Include(e => e.Evidence).AsQueryable();

        if (request.FromDate.HasValue)
        {
            var fromDate = request.FromDate.Value.UtcDateTime;
            query = query.Where(e => e.CreatedAt >= fromDate);
        }

        if (request.ToDate.HasValue)
        {
            var toDate = request.ToDate.Value.UtcDateTime;
            query = query.Where(e => e.CreatedAt <= toDate);
        }

        if (request.UserId.HasValue)
        {
            query = query.Where(e => e.ReviewedBy == request.UserId.Value);
        }

        if (request.AdditionalFilters is not null)
        {
            if (request.AdditionalFilters.TryGetValue("status", out var status) && !string.IsNullOrWhiteSpace(status))
            {
                if (Enum.TryParse<ExceptionStatus>(status, true, out var exceptionStatus))
                {
                    query = query.Where(e => e.Status == exceptionStatus);
                }
            }
        }

        var totalRecords = await query.LongCountAsync();

        if (request.Page.HasValue && request.PageSize.HasValue)
        {
            var skip = (request.Page.Value - 1) * request.PageSize.Value;
            query = query.OrderByDescending(e => e.CreatedAt).Skip(skip).Take(request.PageSize.Value);
        }
        else
        {
            query = query.OrderByDescending(e => e.CreatedAt);
        }

        var records = await query.ToListAsync();

        var data = records.Select(e => new Dictionary<string, object?>
        {
            ["Id"] = e.Id,
            ["EvidenceId"] = e.EvidenceId,
            ["EmployeeId"] = e.Evidence?.EmployeeId,
            ["EmployeeName"] = e.Evidence?.EmployeeName,
            ["CourseName"] = e.Evidence?.CourseName,
            ["Reason"] = e.Reason,
            ["Status"] = e.Status.ToString(),
            ["ReviewedBy"] = e.ReviewedBy,
            ["ReviewedAt"] = e.ReviewedAt?.ToString("o"),
            ["Justification"] = e.Justification,
            ["SlaDeadline"] = e.SlaDeadline.ToString("o"),
            ["IsSlaBreached"] = DateTime.UtcNow > e.SlaDeadline && e.Status == ExceptionStatus.Open,
            ["CreatedAt"] = e.CreatedAt.ToString("o")
        }).ToList();

        return (data, totalRecords);
    }

    private async Task<(List<Dictionary<string, object?>> Data, long TotalRecords)> GetProgramDataAsync(ExportRequestDto request)
    {
        var query = _context.Programs.AsNoTracking().Include(p => p.Policies).AsQueryable();

        if (request.FromDate.HasValue)
        {
            var fromDate = request.FromDate.Value.UtcDateTime;
            query = query.Where(p => p.CreatedAt >= fromDate);
        }

        if (request.ToDate.HasValue)
        {
            var toDate = request.ToDate.Value.UtcDateTime;
            query = query.Where(p => p.CreatedAt <= toDate);
        }

        if (request.AdditionalFilters is not null)
        {
            if (request.AdditionalFilters.TryGetValue("status", out var status) && !string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(p => p.Status == status);
            }
        }

        var totalRecords = await query.LongCountAsync();

        if (request.Page.HasValue && request.PageSize.HasValue)
        {
            var skip = (request.Page.Value - 1) * request.PageSize.Value;
            query = query.OrderByDescending(p => p.CreatedAt).Skip(skip).Take(request.PageSize.Value);
        }
        else
        {
            query = query.OrderByDescending(p => p.CreatedAt);
        }

        var records = await query.ToListAsync();

        var data = records.Select(p => new Dictionary<string, object?>
        {
            ["Id"] = p.Id,
            ["Name"] = p.Name,
            ["Description"] = p.Description,
            ["Status"] = p.Status,
            ["CreatedBy"] = p.CreatedBy,
            ["CreatedAt"] = p.CreatedAt.ToString("o"),
            ["UpdatedAt"] = p.UpdatedAt.ToString("o"),
            ["PolicyCount"] = p.Policies.Count
        }).ToList();

        return (data, totalRecords);
    }

    private async Task<(List<Dictionary<string, object?>> Data, long TotalRecords)> GetPolicyDataAsync(ExportRequestDto request)
    {
        var query = _context.Policies.AsNoTracking().Include(p => p.Program).AsQueryable();

        if (request.FromDate.HasValue)
        {
            var fromDate = request.FromDate.Value.UtcDateTime;
            query = query.Where(p => p.CreatedAt >= fromDate);
        }

        if (request.ToDate.HasValue)
        {
            var toDate = request.ToDate.Value.UtcDateTime;
            query = query.Where(p => p.CreatedAt <= toDate);
        }

        if (request.AdditionalFilters is not null)
        {
            if (request.AdditionalFilters.TryGetValue("status", out var status) && !string.IsNullOrWhiteSpace(status))
            {
                if (Enum.TryParse<PolicyStatus>(status, true, out var policyStatus))
                {
                    query = query.Where(p => p.Status == policyStatus);
                }
            }

            if (request.AdditionalFilters.TryGetValue("programId", out var programIdStr) &&
                Guid.TryParse(programIdStr, out var programId))
            {
                query = query.Where(p => p.ProgramId == programId);
            }
        }

        var totalRecords = await query.LongCountAsync();

        if (request.Page.HasValue && request.PageSize.HasValue)
        {
            var skip = (request.Page.Value - 1) * request.PageSize.Value;
            query = query.OrderByDescending(p => p.CreatedAt).Skip(skip).Take(request.PageSize.Value);
        }
        else
        {
            query = query.OrderByDescending(p => p.CreatedAt);
        }

        var records = await query.ToListAsync();

        var data = records.Select(p => new Dictionary<string, object?>
        {
            ["Id"] = p.Id,
            ["ProgramId"] = p.ProgramId,
            ["ProgramName"] = p.Program?.Name,
            ["Name"] = p.Name,
            ["MinimumScore"] = p.MinimumScore,
            ["RetakeAllowed"] = p.RetakeAllowed,
            ["MaxRetakes"] = p.MaxRetakes,
            ["ExemptionAllowed"] = p.ExemptionAllowed,
            ["Status"] = p.Status.ToString(),
            ["CurrentVersion"] = p.CurrentVersion,
            ["CreatedAt"] = p.CreatedAt.ToString("o"),
            ["UpdatedAt"] = p.UpdatedAt.ToString("o")
        }).ToList();

        return (data, totalRecords);
    }

    private async Task<(List<Dictionary<string, object?>> Data, long TotalRecords)> GetAuditLogDataAsync(ExportRequestDto request)
    {
        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        if (request.FromDate.HasValue)
        {
            var fromDate = request.FromDate.Value.UtcDateTime;
            query = query.Where(a => a.Timestamp >= fromDate);
        }

        if (request.ToDate.HasValue)
        {
            var toDate = request.ToDate.Value.UtcDateTime;
            query = query.Where(a => a.Timestamp <= toDate);
        }

        if (request.UserId.HasValue)
        {
            query = query.Where(a => a.UserId == request.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Action))
        {
            query = query.Where(a => a.Action == request.Action);
        }

        if (!string.IsNullOrWhiteSpace(request.RelatedEntityType))
        {
            query = query.Where(a => a.Entity == request.RelatedEntityType);
        }

        if (request.RelatedEntityId.HasValue)
        {
            query = query.Where(a => a.EntityId == request.RelatedEntityId.Value);
        }

        var totalRecords = await query.LongCountAsync();

        if (request.Page.HasValue && request.PageSize.HasValue)
        {
            var skip = (request.Page.Value - 1) * request.PageSize.Value;
            query = query.OrderByDescending(a => a.Timestamp).Skip(skip).Take(request.PageSize.Value);
        }
        else
        {
            query = query.OrderByDescending(a => a.Timestamp);
        }

        var records = await query.ToListAsync();

        var data = records.Select(a => new Dictionary<string, object?>
        {
            ["Id"] = a.Id,
            ["UserId"] = a.UserId,
            ["UserEmail"] = a.UserEmail,
            ["Action"] = a.Action,
            ["Entity"] = a.Entity,
            ["EntityId"] = a.EntityId,
            ["Details"] = a.Details,
            ["Timestamp"] = a.Timestamp.ToString("o")
        }).ToList();

        return (data, totalRecords);
    }

    private async Task<(List<Dictionary<string, object?>> Data, long TotalRecords)> GetAlertDataAsync(ExportRequestDto request)
    {
        var query = _context.Alerts.AsNoTracking().AsQueryable();

        if (request.FromDate.HasValue)
        {
            query = query.Where(a => a.CreatedAt >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            query = query.Where(a => a.CreatedAt <= request.ToDate.Value);
        }

        if (request.UserId.HasValue)
        {
            query = query.Where(a => a.UserId == request.UserId.Value);
        }

        if (request.AdditionalFilters is not null)
        {
            if (request.AdditionalFilters.TryGetValue("type", out var type) && !string.IsNullOrWhiteSpace(type))
            {
                query = query.Where(a => a.Type == type);
            }

            if (request.AdditionalFilters.TryGetValue("isRead", out var isReadStr) &&
                bool.TryParse(isReadStr, out var isRead))
            {
                query = query.Where(a => a.IsRead == isRead);
            }
        }

        var totalRecords = await query.LongCountAsync();

        if (request.Page.HasValue && request.PageSize.HasValue)
        {
            var skip = (request.Page.Value - 1) * request.PageSize.Value;
            query = query.OrderByDescending(a => a.CreatedAt).Skip(skip).Take(request.PageSize.Value);
        }
        else
        {
            query = query.OrderByDescending(a => a.CreatedAt);
        }

        var records = await query.ToListAsync();

        var data = records.Select(a => new Dictionary<string, object?>
        {
            ["Id"] = a.Id,
            ["UserId"] = a.UserId,
            ["Type"] = a.Type,
            ["Message"] = a.Message,
            ["IsRead"] = a.IsRead,
            ["CreatedAt"] = a.CreatedAt.ToString("o"),
            ["RelatedEntityType"] = a.RelatedEntityType,
            ["RelatedEntityId"] = a.RelatedEntityId
        }).ToList();

        return (data, totalRecords);
    }

    private static byte[] GenerateCsv(List<Dictionary<string, object?>> data)
    {
        if (data.Count == 0)
        {
            return Encoding.UTF8.GetBytes(string.Empty);
        }

        using var memoryStream = new MemoryStream();
        using var writer = new StreamWriter(memoryStream, new UTF8Encoding(true));
        using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            ShouldQuote = _ => true
        });

        var headers = data[0].Keys.ToList();

        foreach (var header in headers)
        {
            csv.WriteField(header);
        }
        csv.NextRecord();

        foreach (var row in data)
        {
            foreach (var header in headers)
            {
                var value = row.TryGetValue(header, out var val) ? val : null;
                csv.WriteField(FormatCsvValue(value));
            }
            csv.NextRecord();
        }

        writer.Flush();
        return memoryStream.ToArray();
    }

    private static string FormatCsvValue(object? value)
    {
        if (value is null)
        {
            return string.Empty;
        }

        if (value is bool boolVal)
        {
            return boolVal ? "true" : "false";
        }

        return value.ToString() ?? string.Empty;
    }

    private static byte[] GenerateJson(List<Dictionary<string, object?>> data)
    {
        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(data, options);
        return jsonBytes;
    }
}