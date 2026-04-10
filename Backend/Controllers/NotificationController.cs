using System.Security.Claims;
using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/alerts")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<NotificationController> _logger;

    public NotificationController(INotificationService notificationService, ILogger<NotificationController> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <summary>
    /// Gets all unread alerts for the current authenticated user.
    /// </summary>
    [HttpGet("unread")]
    [ProducesResponseType(typeof(UnreadAlertsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetUnreadAlerts()
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(new ErrorResponseDto("User identity could not be determined."));
        }

        try
        {
            var result = await _notificationService.GetUnreadAlertsAsync(userId.Value);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving unread alerts for user {UserId}", userId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An error occurred while retrieving unread alerts."));
        }
    }

    /// <summary>
    /// Gets a paginated list of alerts for the current authenticated user.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedAlertsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAlerts([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(new ErrorResponseDto("User identity could not be determined."));
        }

        if (page < 1)
        {
            return BadRequest(new ErrorResponseDto("Page must be at least 1."));
        }

        if (pageSize < 1 || pageSize > 100)
        {
            return BadRequest(new ErrorResponseDto("PageSize must be between 1 and 100."));
        }

        try
        {
            var result = await _notificationService.GetAlertsAsync(userId.Value, page, pageSize);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving alerts for user {UserId}, page {Page}, pageSize {PageSize}",
                userId, page, pageSize);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An error occurred while retrieving alerts."));
        }
    }

    /// <summary>
    /// Marks the specified alerts as read for the current authenticated user.
    /// </summary>
    [HttpPost("mark-read")]
    [ProducesResponseType(typeof(MarkAlertsReadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> MarkAlertsRead([FromBody] MarkAlertsReadDto dto)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(new ErrorResponseDto("User identity could not be determined."));
        }

        if (dto?.AlertIds is null || dto.AlertIds.Count == 0)
        {
            return BadRequest(new ErrorResponseDto("At least one alert ID is required."));
        }

        if (dto.AlertIds.Count > 50)
        {
            return BadRequest(new ErrorResponseDto("Cannot mark more than 50 alerts as read at once."));
        }

        try
        {
            var result = await _notificationService.MarkAlertsReadAsync(userId.Value, dto.AlertIds);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking alerts as read for user {UserId}, alert count {Count}",
                userId, dto.AlertIds.Count);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An error occurred while marking alerts as read."));
        }
    }

    private Guid? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrWhiteSpace(userIdClaim))
        {
            return null;
        }

        if (Guid.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        return null;
    }
}