using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.DTOs;
using Backend.Services;
using System.Security.Claims;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "LearningManager,SharedServices,Admin")]
public class EvidenceController : ControllerBase
{
    private readonly IEvidenceService _evidenceService;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<EvidenceController> _logger;

    public EvidenceController(
        IEvidenceService evidenceService,
        IAuditLogService auditLogService,
        ILogger<EvidenceController> logger)
    {
        _evidenceService = evidenceService;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    /// <summary>
    /// Uploads and parses a CSV/Excel file, performs deduplication, and returns a preview of parsed records.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    [ProducesResponseType(typeof(EvidenceUploadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new ErrorResponseDto("No file provided or file is empty."));
        }

        var allowedExtensions = new[] { ".csv", ".xls", ".xlsx" };
        var extension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
        {
            return BadRequest(new ErrorResponseDto("Invalid file format. Only CSV and Excel (.csv, .xls, .xlsx) files are supported."));
        }

        var userId = GetUserId();
        var userEmail = GetUserEmail();

        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        try
        {
            _logger.LogInformation(
                "User {UserEmail} ({UserId}) uploading evidence file: {FileName} ({FileSize} bytes)",
                userEmail, userId, file.FileName, file.Length);

            var result = await _evidenceService.UploadEvidenceAsync(file, userId);

            await _auditLogService.LogActionAsync(
                userId,
                userEmail ?? "unknown",
                "EvidenceUpload",
                "Evidence",
                null,
                new
                {
                    FileName = file.FileName,
                    FileSize = file.Length,
                    TotalRecords = result.TotalRecords,
                    DeduplicatedCount = result.DeduplicatedCount,
                    NewRecordsCount = result.NewRecordsCount
                });

            _logger.LogInformation(
                "Evidence upload complete. Total: {Total}, Deduplicated: {Deduplicated}, New: {New}",
                result.TotalRecords, result.DeduplicatedCount, result.NewRecordsCount);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Validation error during evidence upload by {UserEmail}", userEmail);
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
        catch (Exception ex)
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogError(ex, "Unexpected error during evidence upload. CorrelationId: {CorrelationId}", correlationId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An unexpected error occurred during file upload.", correlationId));
        }
    }

    /// <summary>
    /// Confirms and persists previously uploaded evidence records.
    /// </summary>
    [HttpPost("confirm")]
    [ProducesResponseType(typeof(List<EvidenceResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Confirm([FromBody] EvidenceValidateRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new ErrorResponseDto("Invalid request. At least one evidence ID is required."));
        }

        var userId = GetUserId();
        var userEmail = GetUserEmail();

        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        try
        {
            var evidenceGuids = request.EvidenceIds
                .Select(id => new Guid(id.ToString("D32").PadLeft(32, '0')))
                .ToList();

            _logger.LogInformation(
                "User {UserEmail} ({UserId}) confirming {Count} evidence records",
                userEmail, userId, request.EvidenceIds.Count);

            var result = await _evidenceService.ConfirmEvidenceAsync(evidenceGuids, userId);

            await _auditLogService.LogActionAsync(
                userId,
                userEmail ?? "unknown",
                "EvidenceConfirm",
                "Evidence",
                null,
                new
                {
                    ConfirmedCount = result.Count,
                    EvidenceIds = request.EvidenceIds
                });

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Validation error during evidence confirmation by {UserEmail}", userEmail);
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Evidence not found during confirmation by {UserEmail}", userEmail);
            return NotFound(new ErrorResponseDto(ex.Message));
        }
        catch (Exception ex)
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogError(ex, "Unexpected error during evidence confirmation. CorrelationId: {CorrelationId}", correlationId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An unexpected error occurred during evidence confirmation.", correlationId));
        }
    }

    /// <summary>
    /// Triggers simulated AI validation for the specified evidence records.
    /// </summary>
    [HttpPost("validate")]
    [ProducesResponseType(typeof(EvidenceValidateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Validate([FromBody] EvidenceValidateRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new ErrorResponseDto("Invalid request. At least one evidence ID is required."));
        }

        var userId = GetUserId();
        var userEmail = GetUserEmail();

        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        try
        {
            _logger.LogInformation(
                "User {UserEmail} ({UserId}) triggering validation for {Count} evidence records",
                userEmail, userId, request.EvidenceIds.Count);

            var result = await _evidenceService.ValidateEvidenceAsync(request.EvidenceIds, userId);

            await _auditLogService.LogActionAsync(
                userId,
                userEmail ?? "unknown",
                "EvidenceValidate",
                "Evidence",
                null,
                new
                {
                    TotalValidated = result.TotalValidated,
                    ExceptionsFlagged = result.ExceptionsFlagged,
                    EvidenceIds = request.EvidenceIds
                });

            _logger.LogInformation(
                "Evidence validation complete. Validated: {Validated}, Exceptions: {Exceptions}",
                result.TotalValidated, result.ExceptionsFlagged);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Validation error during evidence validation by {UserEmail}", userEmail);
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Evidence not found during validation by {UserEmail}", userEmail);
            return NotFound(new ErrorResponseDto(ex.Message));
        }
        catch (Exception ex)
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogError(ex, "Unexpected error during evidence validation. CorrelationId: {CorrelationId}", correlationId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An unexpected error occurred during evidence validation.", correlationId));
        }
    }

    /// <summary>
    /// Retrieves a paginated list of evidence records with optional filtering.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(EvidenceListResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetEvidence(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? employeeId = null,
        [FromQuery] Guid? programId = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 100) pageSize = 100;

        try
        {
            var result = await _evidenceService.GetEvidenceAsync(page, pageSize, status, employeeId, programId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogError(ex, "Unexpected error retrieving evidence list. CorrelationId: {CorrelationId}", correlationId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An unexpected error occurred while retrieving evidence.", correlationId));
        }
    }

    /// <summary>
    /// Retrieves a single evidence record by its ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(EvidenceResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetEvidenceById(Guid id)
    {
        try
        {
            var result = await _evidenceService.GetEvidenceByIdAsync(id);

            if (result is null)
            {
                return NotFound(new ErrorResponseDto($"Evidence record with ID '{id}' was not found."));
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogError(ex, "Unexpected error retrieving evidence {EvidenceId}. CorrelationId: {CorrelationId}", id, correlationId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("An unexpected error occurred while retrieving the evidence record.", correlationId));
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