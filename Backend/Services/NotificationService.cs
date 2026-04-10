using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Avante.Backend.Hubs;

namespace Backend.Services;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        AppDbContext context,
        IHubContext<NotificationHub> hubContext,
        ILogger<NotificationService> logger)
    {
        _context = context;
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<AlertResponseDto> SendAlertAsync(
        Guid userId,
        string type,
        string message,
        string? relatedEntityType = null,
        Guid? relatedEntityId = null)
    {
        _logger.LogInformation(
            "Sending alert to user {UserId}. Type: {Type}, Message: {Message}",
            userId, type, message);

        var alert = new Alert
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            Message = message,
            IsRead = false,
            CreatedAt = DateTimeOffset.UtcNow,
            RelatedEntityType = relatedEntityType,
            RelatedEntityId = relatedEntityId
        };

        _context.Alerts.Add(alert);
        await _context.SaveChangesAsync();

        var dto = MapToDto(alert);

        try
        {
            var notification = new
            {
                Id = dto.Id.ToString(),
                dto.Type,
                dto.Message,
                CreatedAt = dto.CreatedAt,
                dto.IsRead,
                dto.RelatedEntityType,
                RelatedEntityId = dto.RelatedEntityId?.ToString()
            };

            await _hubContext.Clients
                .Group(userId.ToString())
                .SendAsync("ReceiveNotification", notification);

            _logger.LogInformation(
                "Real-time notification pushed to user {UserId} for alert {AlertId}",
                userId, alert.Id);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to push real-time notification to user {UserId} for alert {AlertId}. " +
                "Alert was persisted and will be available via polling.",
                userId, alert.Id);
        }

        return dto;
    }

    /// <inheritdoc />
    public async Task<UnreadAlertsResponseDto> GetUnreadAlertsAsync(Guid userId)
    {
        _logger.LogDebug("Retrieving unread alerts for user {UserId}", userId);

        var alerts = await _context.Alerts
            .AsNoTracking()
            .Where(a => a.UserId == userId && !a.IsRead)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return new UnreadAlertsResponseDto
        {
            UnreadCount = alerts.Count,
            Alerts = alerts.Select(MapToDto).ToList()
        };
    }

    /// <inheritdoc />
    public async Task<MarkAlertsReadResponseDto> MarkAlertsReadAsync(Guid userId, IEnumerable<Guid> alertIds)
    {
        var alertIdList = alertIds.ToList();

        _logger.LogInformation(
            "Marking {Count} alerts as read for user {UserId}",
            alertIdList.Count, userId);

        if (alertIdList.Count == 0)
        {
            return new MarkAlertsReadResponseDto { Success = true };
        }

        var alerts = await _context.Alerts
            .Where(a => a.UserId == userId && alertIdList.Contains(a.Id) && !a.IsRead)
            .ToListAsync();

        foreach (var alert in alerts)
        {
            alert.IsRead = true;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Marked {UpdatedCount} of {RequestedCount} alerts as read for user {UserId}",
            alerts.Count, alertIdList.Count, userId);

        return new MarkAlertsReadResponseDto { Success = true };
    }

    /// <inheritdoc />
    public async Task<PagedAlertsResponseDto> GetAlertsAsync(Guid userId, int page, int pageSize)
    {
        _logger.LogDebug(
            "Retrieving alerts for user {UserId}. Page: {Page}, PageSize: {PageSize}",
            userId, page, pageSize);

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Alerts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt);

        var total = await query.CountAsync();

        var alerts = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedAlertsResponseDto
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Alerts = alerts.Select(MapToDto).ToList()
        };
    }

    private static AlertResponseDto MapToDto(Alert alert)
    {
        return new AlertResponseDto
        {
            Id = alert.Id,
            Type = alert.Type,
            Message = alert.Message,
            CreatedAt = alert.CreatedAt,
            IsRead = alert.IsRead,
            RelatedEntityType = alert.RelatedEntityType,
            RelatedEntityId = alert.RelatedEntityId
        };
    }
}