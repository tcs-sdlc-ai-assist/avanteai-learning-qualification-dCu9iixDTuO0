using System.Security.Claims;
using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(IDashboardService dashboardService, ILogger<DashboardController> logger)
    {
        _dashboardService = dashboardService;
        _logger = logger;
    }

    /// <summary>
    /// Returns a high-level compliance dashboard summary tailored to the caller's role.
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(DashboardSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetSummary()
    {
        try
        {
            var (userId, role) = GetUserClaims();

            _logger.LogInformation(
                "Dashboard summary requested by user {UserId} with role {Role}",
                userId, role);

            var summary = await _dashboardService.GetSummaryAsync(userId, role);
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving dashboard summary");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An error occurred while retrieving the dashboard summary."));
        }
    }

    /// <summary>
    /// Returns exception trend data for dashboard charts, filtered by the caller's role.
    /// </summary>
    [HttpGet("exception-trends")]
    [ProducesResponseType(typeof(IReadOnlyList<ExceptionTrendDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetExceptionTrends()
    {
        try
        {
            var (userId, role) = GetUserClaims();

            _logger.LogInformation(
                "Exception trends requested by user {UserId} with role {Role}",
                userId, role);

            var trends = await _dashboardService.GetExceptionTrendsAsync(userId, role);
            return Ok(trends);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving exception trends");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An error occurred while retrieving exception trends."));
        }
    }

    /// <summary>
    /// Returns SLA compliance metrics for the dashboard, filtered by the caller's role.
    /// </summary>
    [HttpGet("sla-metrics")]
    [ProducesResponseType(typeof(SlaMetricsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetSlaMetrics()
    {
        try
        {
            var (userId, role) = GetUserClaims();

            _logger.LogInformation(
                "SLA metrics requested by user {UserId} with role {Role}",
                userId, role);

            var metrics = await _dashboardService.GetSlaMetricsAsync(userId, role);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving SLA metrics");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An error occurred while retrieving SLA metrics."));
        }
    }

    /// <summary>
    /// Returns a list of overdue training records for the dashboard, filtered by the caller's role.
    /// </summary>
    [HttpGet("overdue-training")]
    [ProducesResponseType(typeof(IReadOnlyList<OverdueTrainingDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetOverdueTraining()
    {
        try
        {
            var (userId, role) = GetUserClaims();

            _logger.LogInformation(
                "Overdue training requested by user {UserId} with role {Role}",
                userId, role);

            var overdueItems = await _dashboardService.GetOverdueTrainingAsync(userId, role);
            return Ok(overdueItems);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving overdue training data");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An error occurred while retrieving overdue training data."));
        }
    }

    private (Guid UserId, string Role) GetUserClaims()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid or missing user identifier in token.");
        }

        var role = User.FindFirst(ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value
            ?? "Viewer";

        return (userId, role);
    }
}