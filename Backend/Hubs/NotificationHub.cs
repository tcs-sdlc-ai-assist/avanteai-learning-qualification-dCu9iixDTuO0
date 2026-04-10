using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace Avante.Backend.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(ILogger<NotificationHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        var userEmail = GetUserEmail();

        if (userId is not null)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);
            _logger.LogInformation(
                "User {UserEmail} ({UserId}) connected to NotificationHub. ConnectionId: {ConnectionId}",
                userEmail, userId, Context.ConnectionId);
        }
        else
        {
            _logger.LogWarning(
                "Connection {ConnectionId} established without a valid user ID claim.",
                Context.ConnectionId);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        var userEmail = GetUserEmail();

        if (userId is not null)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
            _logger.LogInformation(
                "User {UserEmail} ({UserId}) disconnected from NotificationHub. ConnectionId: {ConnectionId}",
                userEmail, userId, Context.ConnectionId);
        }

        if (exception is not null)
        {
            _logger.LogError(exception,
                "NotificationHub disconnection error for ConnectionId: {ConnectionId}",
                Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Sends a notification to a specific user by their user ID.
    /// </summary>
    public async Task SendNotification(string targetUserId, string type, string message, string? relatedEntityType = null, string? relatedEntityId = null)
    {
        var senderUserId = GetUserId();
        var senderEmail = GetUserEmail();

        if (string.IsNullOrWhiteSpace(targetUserId))
        {
            _logger.LogWarning("SendNotification called with empty targetUserId by {SenderEmail}", senderEmail);
            return;
        }

        var notification = new
        {
            Id = Guid.NewGuid().ToString(),
            Type = type,
            Message = message,
            CreatedAt = DateTimeOffset.UtcNow,
            IsRead = false,
            RelatedEntityType = relatedEntityType,
            RelatedEntityId = relatedEntityId
        };

        _logger.LogInformation(
            "Sending notification to user {TargetUserId}. Type: {Type}, Message: {Message}, SentBy: {SenderEmail}",
            targetUserId, type, message, senderEmail);

        await Clients.Group(targetUserId).SendAsync("ReceiveNotification", notification);
    }

    /// <summary>
    /// Broadcasts an alert to all connected, authenticated users.
    /// </summary>
    public async Task BroadcastAlert(string type, string message, string? relatedEntityType = null, string? relatedEntityId = null)
    {
        var senderEmail = GetUserEmail();

        var alert = new
        {
            Id = Guid.NewGuid().ToString(),
            Type = type,
            Message = message,
            CreatedAt = DateTimeOffset.UtcNow,
            IsRead = false,
            RelatedEntityType = relatedEntityType,
            RelatedEntityId = relatedEntityId
        };

        _logger.LogInformation(
            "Broadcasting alert to all users. Type: {Type}, Message: {Message}, SentBy: {SenderEmail}",
            type, message, senderEmail);

        await Clients.All.SendAsync("ReceiveAlert", alert);
    }

    private string? GetUserId()
    {
        return Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? Context.User?.FindFirst("sub")?.Value;
    }

    private string? GetUserEmail()
    {
        return Context.User?.FindFirst(ClaimTypes.Email)?.Value
            ?? Context.User?.FindFirst("email")?.Value;
    }
}