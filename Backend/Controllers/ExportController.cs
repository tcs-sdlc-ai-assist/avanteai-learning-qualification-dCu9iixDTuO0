using System.Security.Claims;
using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/export")]
[Authorize(Roles = "SharedServices,LearningManager,Admin")]
public class ExportController : ControllerBase
{
    private readonly IExportService _exportService;
    private readonly ILogger<ExportController> _logger;

    public ExportController(IExportService exportService, ILogger<ExportController> logger)
    {
        _exportService = exportService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Export([FromBody] ExportRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrWhiteSpace(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new ErrorResponseDto("Unable to determine user identity."));
        }

        try
        {
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "unknown";
            _logger.LogInformation(
                "Export requested by {UserEmail} ({UserId}). EntityType: {EntityType}, Format: {Format}",
                userEmail, userId, request.EntityType, request.Format);

            var result = await _exportService.ExportDataAsync(request, userId);

            _logger.LogInformation(
                "Export completed for {UserEmail}. FileName: {FileName}, TotalRecords: {TotalRecords}",
                userEmail, result.FileName, result.TotalRecords);

            return File(result.Data, result.ContentType, result.FileName);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid export request from user {UserId}: {Message}", userId, ex.Message);
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Export operation failed for user {UserId}: {Message}", userId, ex.Message);
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during export for user {UserId}", userId);
            return StatusCode(500, new ErrorResponseDto("An unexpected error occurred while processing the export."));
        }
    }
}