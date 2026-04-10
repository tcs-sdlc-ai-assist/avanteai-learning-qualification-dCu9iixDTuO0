namespace Backend.DTOs;

public class AlertResponseDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public bool IsRead { get; set; }
    public string? RelatedEntityType { get; set; }
    public Guid? RelatedEntityId { get; set; }
}

public class UnreadAlertsResponseDto
{
    public int UnreadCount { get; set; }
    public IReadOnlyList<AlertResponseDto> Alerts { get; set; } = [];
}

public class MarkAlertsReadDto
{
    public required List<Guid> AlertIds { get; set; }
}

public class MarkAlertsReadResponseDto
{
    public bool Success { get; set; }
}

public class PagedAlertsResponseDto
{
    public int Total { get; set; }
    public IReadOnlyList<AlertResponseDto> Alerts { get; set; } = [];
    public int Page { get; set; }
    public int PageSize { get; set; }
}