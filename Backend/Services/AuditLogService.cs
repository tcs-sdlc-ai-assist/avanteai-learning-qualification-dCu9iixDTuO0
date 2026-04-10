using System.Text.Json;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Backend.Services;

public class AuditLogService : IAuditLogService
{
    private readonly AppDbContext _context;
    private readonly ILogger<AuditLogService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public AuditLogService(AppDbContext context, ILogger<AuditLogService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task LogActionAsync(Guid userId, string userEmail, string action, string entity, Guid? entityId, object? details)
    {
        string? detailsJson = null;

        if (details is not null)
        {
            try
            {
                detailsJson = JsonSerializer.Serialize(details, JsonOptions);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Failed to serialize audit log details for action {Action} on {Entity}/{EntityId}", action, entity, entityId);
                detailsJson = JsonSerializer.Serialize(new { error = "Failed to serialize details" }, JsonOptions);
            }
        }

        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            UserEmail = userEmail,
            Action = action,
            Entity = entity,
            EntityId = entityId,
            Details = detailsJson,
            Timestamp = DateTime.UtcNow
        };

        _context.AuditLogs.Add(auditLog);

        try
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation(
                "Audit log created: {AuditLogId} | User: {UserEmail} ({UserId}) | Action: {Action} | Entity: {Entity}/{EntityId}",
                auditLog.Id, userEmail, userId, action, entity, entityId);
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex,
                "Failed to persist audit log entry for action {Action} on {Entity}/{EntityId} by user {UserEmail}",
                action, entity, entityId, userEmail);
            throw;
        }
    }

    public async Task<AuditLogResponseDto?> GetLogAsync(Guid id)
    {
        var log = await _context.AuditLogs
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (log is null)
        {
            return null;
        }

        return MapToDto(log);
    }

    public async Task<AuditLogPagedResultDto> QueryLogsAsync(AuditLogQueryDto query)
    {
        var queryable = _context.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.EntityType))
        {
            queryable = queryable.Where(a => a.Entity == query.EntityType);
        }

        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            queryable = queryable.Where(a => a.Action == query.Action);
        }

        if (query.UserId.HasValue)
        {
            queryable = queryable.Where(a => a.UserId == query.UserId.Value);
        }

        if (query.FromDate.HasValue)
        {
            var fromUtc = query.FromDate.Value.UtcDateTime;
            queryable = queryable.Where(a => a.Timestamp >= fromUtc);
        }

        if (query.ToDate.HasValue)
        {
            var toUtc = query.ToDate.Value.UtcDateTime;
            queryable = queryable.Where(a => a.Timestamp <= toUtc);
        }

        var total = await queryable.CountAsync();

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var logs = await queryable
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new AuditLogPagedResultDto
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Logs = logs.Select(MapToDto).ToList()
        };
    }

    private static AuditLogResponseDto MapToDto(AuditLog log)
    {
        JsonElement? detailsElement = null;

        if (!string.IsNullOrWhiteSpace(log.Details))
        {
            try
            {
                detailsElement = JsonSerializer.Deserialize<JsonElement>(log.Details);
            }
            catch (JsonException)
            {
                // If details can't be deserialized, leave as null
            }
        }

        return new AuditLogResponseDto
        {
            Id = log.Id,
            UserId = log.UserId,
            UserEmail = log.UserEmail,
            Action = log.Action,
            EntityType = log.Entity,
            EntityId = log.EntityId ?? Guid.Empty,
            Details = detailsElement,
            Timestamp = new DateTimeOffset(log.Timestamp, TimeSpan.Zero)
        };
    }
}