using Backend.DTOs;

namespace Backend.Services;

public interface INotificationService
{
    /// <summary>
    /// Creates and persists a new alert for the specified user, and pushes it via SignalR if the user is connected.
    /// </summary>
    /// <param name="userId">The target user's ID.</param>
    /// <param name="type">The alert type (e.g., "ExceptionFlagged", "SlaBreach", "Approval").</param>
    /// <param name="message">The alert message text.</param>
    /// <param name="relatedEntityType">Optional entity type related to the alert.</param>
    /// <param name="relatedEntityId">Optional entity ID related to the alert.</param>
    /// <returns>The created alert response.</returns>
    Task<AlertResponseDto> SendAlertAsync(Guid userId, string type, string message, string? relatedEntityType = null, Guid? relatedEntityId = null);

    /// <summary>
    /// Retrieves all unread alerts for the specified user, along with the unread count.
    /// </summary>
    /// <param name="userId">The user's ID.</param>
    /// <returns>An object containing the unread count and the list of unread alerts.</returns>
    Task<UnreadAlertsResponseDto> GetUnreadAlertsAsync(Guid userId);

    /// <summary>
    /// Marks the specified alerts as read for the given user.
    /// Only alerts belonging to the user will be updated.
    /// </summary>
    /// <param name="userId">The user's ID.</param>
    /// <param name="alertIds">The list of alert IDs to mark as read.</param>
    /// <returns>A result indicating success.</returns>
    Task<MarkAlertsReadResponseDto> MarkAlertsReadAsync(Guid userId, IEnumerable<Guid> alertIds);

    /// <summary>
    /// Retrieves a paged list of alerts for the specified user.
    /// </summary>
    /// <param name="userId">The user's ID.</param>
    /// <param name="page">The page number (1-based).</param>
    /// <param name="pageSize">The number of alerts per page.</param>
    /// <returns>A paged result containing alerts and pagination metadata.</returns>
    Task<PagedAlertsResponseDto> GetAlertsAsync(Guid userId, int page, int pageSize);
}