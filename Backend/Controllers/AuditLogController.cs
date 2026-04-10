using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.DTOs;
using Backend.Services;

namespace Avante.Backend.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = "Auditor,Admin")]
public class AuditLogController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<AuditLogController> _logger;

    public AuditLogController(IAuditLogService auditLogService, ILogger<AuditLogController> logger)
    {
        _auditLogService = auditLogService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves a paginated list of audit logs with optional filtering by entity type, action, user, and date range.
    /// </summary>
    /// <param name="query">Query parameters for filtering and pagination.</param>
    /// <returns>A paged result of audit log entries.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(AuditLogPagedResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAuditLogs([FromQuery] AuditLogQueryDto query)
    {
        if (!ModelState.IsValid)
        {
            var errors = string.Join("; ", ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage));
            _logger.LogWarning("Invalid audit log query parameters: {Errors}", errors);
            return BadRequest(new ErrorResponseDto(errors));
        }

        try
        {
            _logger.LogInformation(
                "Querying audit logs. EntityType={EntityType}, Action={Action}, UserId={UserId}, FromDate={FromDate}, ToDate={ToDate}, Page={Page}, PageSize={PageSize}",
                query.EntityType, query.Action, query.UserId, query.FromDate, query.ToDate, query.Page, query.PageSize);

            var result = await _auditLogService.QueryLogsAsync(query);

            _logger.LogInformation(
                "Audit log query returned {Total} total records, page {Page} of {PageSize}",
                result.Total, result.Page, result.PageSize);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying audit logs");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An error occurred while retrieving audit logs."));
        }
    }

    /// <summary>
    /// Retrieves a single audit log entry by its unique identifier.
    /// </summary>
    /// <param name="id">The audit log entry ID.</param>
    /// <returns>The audit log entry if found.</returns>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AuditLogResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAuditLog(Guid id)
    {
        try
        {
            _logger.LogInformation("Retrieving audit log entry {AuditLogId}", id);

            var log = await _auditLogService.GetLogAsync(id);

            if (log is null)
            {
                _logger.LogWarning("Audit log entry {AuditLogId} not found", id);
                return NotFound(new ErrorResponseDto($"Audit log entry with ID '{id}' was not found."));
            }

            return Ok(log);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving audit log entry {AuditLogId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An error occurred while retrieving the audit log entry."));
        }
    }
}