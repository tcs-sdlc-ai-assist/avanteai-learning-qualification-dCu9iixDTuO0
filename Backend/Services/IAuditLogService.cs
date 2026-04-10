using Backend.DTOs;

namespace Backend.Services;

public interface IAuditLogService
{
    Task LogActionAsync(Guid userId, string userEmail, string action, string entity, Guid? entityId, object? details);

    Task<AuditLogResponseDto?> GetLogAsync(Guid id);

    Task<AuditLogPagedResultDto> QueryLogsAsync(AuditLogQueryDto query);
}