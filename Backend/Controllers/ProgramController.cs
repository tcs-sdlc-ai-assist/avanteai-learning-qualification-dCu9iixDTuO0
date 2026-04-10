using System.Security.Claims;
using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/programs")]
[Authorize(Roles = "LearningManager,Admin")]
public class ProgramController : ControllerBase
{
    private readonly IProgramService _programService;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<ProgramController> _logger;

    public ProgramController(
        IProgramService programService,
        IAuditLogService auditLogService,
        ILogger<ProgramController> logger)
    {
        _programService = programService;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    /// <summary>
    /// Lists all compliance programs.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ProgramResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAll()
    {
        var programs = await _programService.GetAllAsync();
        return Ok(programs);
    }

    /// <summary>
    /// Gets a single compliance program by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ProgramResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var program = await _programService.GetByIdAsync(id);

        if (program is null)
        {
            return NotFound(new ErrorResponseDto("Program not found."));
        }

        return Ok(program);
    }

    /// <summary>
    /// Creates a new compliance program.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ProgramResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Create([FromBody] CreateProgramDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = GetUserId();
        var userEmail = GetUserEmail();

        try
        {
            var program = await _programService.CreateAsync(dto, userId);

            _logger.LogInformation(
                "User {UserEmail} ({UserId}) created program {ProgramId} '{ProgramName}'",
                userEmail, userId, program.Id, program.Name);

            await _auditLogService.LogActionAsync(
                userId,
                userEmail,
                "Create",
                "Program",
                program.Id,
                new { program.Name, program.Description });

            return CreatedAtAction(nameof(GetById), new { id = program.Id }, program);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to create program: {Message}", ex.Message);
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
    }

    /// <summary>
    /// Updates an existing compliance program.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ProgramResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProgramDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = GetUserId();
        var userEmail = GetUserEmail();

        try
        {
            var program = await _programService.UpdateAsync(id, dto);

            _logger.LogInformation(
                "User {UserEmail} ({UserId}) updated program {ProgramId} '{ProgramName}'",
                userEmail, userId, program.Id, program.Name);

            await _auditLogService.LogActionAsync(
                userId,
                userEmail,
                "Update",
                "Program",
                program.Id,
                new { program.Name, program.Description, program.Status });

            return Ok(program);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Program not found for update: {ProgramId}", id);
            return NotFound(new ErrorResponseDto(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to update program {ProgramId}: {Message}", id, ex.Message);
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
    }

    /// <summary>
    /// Deletes a compliance program.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var userEmail = GetUserEmail();

        try
        {
            await _programService.DeleteAsync(id);

            _logger.LogInformation(
                "User {UserEmail} ({UserId}) deleted program {ProgramId}",
                userEmail, userId, id);

            await _auditLogService.LogActionAsync(
                userId,
                userEmail,
                "Delete",
                "Program",
                id,
                null);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Program not found for deletion: {ProgramId}", id);
            return NotFound(new ErrorResponseDto(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to delete program {ProgramId}: {Message}", id, ex.Message);
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID claim not found.");
        }

        return userId;
    }

    private string GetUserEmail()
    {
        return User.FindFirst(ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value
            ?? "unknown";
    }
}