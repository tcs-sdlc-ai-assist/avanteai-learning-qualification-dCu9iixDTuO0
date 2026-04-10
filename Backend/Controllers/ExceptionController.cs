using System.Security.Claims;
using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/exceptions")]
[Authorize(Roles = "QualificationsTeam,LearningManager,Admin")]
public class ExceptionController : ControllerBase
{
    private readonly IExceptionService _exceptionService;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<ExceptionController> _logger;

    public ExceptionController(
        IExceptionService exceptionService,
        IAuditLogService auditLogService,
        ILogger<ExceptionController> logger)
    {
        _exceptionService = exceptionService;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    /// <summary>
    /// Returns a paginated list of exceptions for the review queue, with optional status filter and SLA info.
    /// </summary>
    [HttpGet("queue")]
    [ProducesResponseType(typeof(ExceptionQueueResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetQueue(
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1)
        {
            return BadRequest(new ErrorResponseDto("Page must be at least 1."));
        }

        if (pageSize < 1 || pageSize > 100)
        {
            return BadRequest(new ErrorResponseDto("PageSize must be between 1 and 100."));
        }

        if (status is not null)
        {
            var validStatuses = new[] { "Open", "Approved", "Overridden", "Rejected" };
            if (!validStatuses.Contains(status, StringComparer.OrdinalIgnoreCase))
            {
                return BadRequest(new ErrorResponseDto("Status must be one of: Open, Approved, Overridden, Rejected."));
            }
        }

        try
        {
            var result = await _exceptionService.GetQueueAsync(status, page, pageSize);
            return Ok(result);
        }
        catch (Exception ex)
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogError(ex, "Error retrieving exception queue. CorrelationId: {CorrelationId}", correlationId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An unexpected error occurred.", correlationId));
        }
    }

    /// <summary>
    /// Returns a paginated list of open exceptions for the review queue.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ExceptionQueueResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetOpenExceptions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
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
            var result = await _exceptionService.GetOpenExceptionsAsync(page, pageSize);
            return Ok(result);
        }
        catch (Exception ex)
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogError(ex, "Error retrieving open exceptions. CorrelationId: {CorrelationId}", correlationId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An unexpected error occurred.", correlationId));
        }
    }

    /// <summary>
    /// Returns a single exception by its ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ExceptionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetExceptionById(Guid id)
    {
        try
        {
            var result = await _exceptionService.GetExceptionByIdAsync(id);

            if (result is null)
            {
                return NotFound(new ErrorResponseDto($"Exception with ID '{id}' not found."));
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogError(ex, "Error retrieving exception {ExceptionId}. CorrelationId: {CorrelationId}", id, correlationId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An unexpected error occurred.", correlationId));
        }
    }

    /// <summary>
    /// Submits a review action (Approved, Overridden, or Rejected) for an open exception.
    /// </summary>
    [HttpPost("review")]
    [ProducesResponseType(typeof(ExceptionReviewResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ReviewException([FromBody] ExceptionReviewDto review)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(new ErrorResponseDto(string.Join(" ", errors)));
        }

        var reviewerId = GetUserId();
        if (reviewerId == Guid.Empty)
        {
            return Unauthorized(new ErrorResponseDto("Unable to identify the current user."));
        }

        var userEmail = GetUserEmail() ?? "unknown";

        try
        {
            var result = await _exceptionService.ReviewExceptionAsync(review, reviewerId);

            await _auditLogService.LogActionAsync(
                reviewerId,
                userEmail,
                $"Exception{review.Action}",
                "Exception",
                null,
                new
                {
                    ExceptionId = review.ExceptionId,
                    Action = review.Action,
                    Justification = review.Justification,
                    ResultStatus = result.Status
                });

            _logger.LogInformation(
                "Exception {ExceptionId} reviewed by {UserEmail}. Action: {Action}, Result: {Status}",
                review.ExceptionId, userEmail, review.Action, result.Status);

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponseDto(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
        catch (Exception ex)
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogError(ex,
                "Error reviewing exception {ExceptionId}. CorrelationId: {CorrelationId}",
                review.ExceptionId, correlationId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An unexpected error occurred.", correlationId));
        }
    }

    /// <summary>
    /// Submits a review action for an exception identified by route ID.
    /// </summary>
    [HttpPost("{id:guid}/review")]
    [ProducesResponseType(typeof(ExceptionReviewResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ReviewExceptionById(Guid id, [FromBody] ExceptionReviewDto review)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(new ErrorResponseDto(string.Join(" ", errors)));
        }

        var reviewerId = GetUserId();
        if (reviewerId == Guid.Empty)
        {
            return Unauthorized(new ErrorResponseDto("Unable to identify the current user."));
        }

        var userEmail = GetUserEmail() ?? "unknown";

        try
        {
            var result = await _exceptionService.ReviewExceptionAsync(review, reviewerId);

            await _auditLogService.LogActionAsync(
                reviewerId,
                userEmail,
                $"Exception{review.Action}",
                "Exception",
                id,
                new
                {
                    ExceptionId = review.ExceptionId,
                    Action = review.Action,
                    Justification = review.Justification,
                    ResultStatus = result.Status
                });

            _logger.LogInformation(
                "Exception {ExceptionId} reviewed by {UserEmail} via route {RouteId}. Action: {Action}, Result: {Status}",
                review.ExceptionId, userEmail, id, review.Action, result.Status);

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponseDto(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
        catch (Exception ex)
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogError(ex,
                "Error reviewing exception {ExceptionId} via route {RouteId}. CorrelationId: {CorrelationId}",
                review.ExceptionId, id, correlationId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An unexpected error occurred.", correlationId));
        }
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Guid.Empty;
        }

        return userId;
    }

    private string? GetUserEmail()
    {
        return User.FindFirst(ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value;
    }
}