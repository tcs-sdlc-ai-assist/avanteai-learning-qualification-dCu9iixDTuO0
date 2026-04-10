using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Backend.DTOs;

public class AuditLogResponseDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public JsonElement? Details { get; set; }
    public DateTimeOffset Timestamp { get; set; }
}

public class AuditLogQueryDto
{
    public string? EntityType { get; set; }

    public string? Action { get; set; }

    public Guid? UserId { get; set; }

    public DateTimeOffset? FromDate { get; set; }

    public DateTimeOffset? ToDate { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Page must be at least 1.")]
    public int Page { get; set; } = 1;

    [Range(1, 100, ErrorMessage = "PageSize must be between 1 and 100.")]
    public int PageSize { get; set; } = 20;
}

public class AuditLogPagedResultDto
{
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public IReadOnlyList<AuditLogResponseDto> Logs { get; set; } = Array.Empty<AuditLogResponseDto>();
}