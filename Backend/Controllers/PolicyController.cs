using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.DTOs;
using Backend.Services;
using System.Security.Claims;

namespace Backend.Controllers;

[ApiController]
[Route("api/policies")]
[Authorize(Roles = "LearningManager,Admin")]
public class PolicyController : ControllerBase
{
    private readonly IPolicyService _policyService;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<PolicyController> _logger;

    public PolicyController(
        IPolicyService policyService,
        IAuditLogService auditLogService,
        ILogger<PolicyController> logger)
    {
        _policyService = policyService;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    /// <summary>
    /// List all policies.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PolicyResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPolicies()
    {
        var policies = await _policyService.GetPoliciesAsync();
        return Ok(policies);
    }

    /// <summary>
    /// Get active policies (for sibling clusters such as Evidence Validation).
    /// </summary>
    [HttpGet("active")]
    [ProducesResponseType(typeof(List<PolicyResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActivePolicies()
    {
        var policies = await _policyService.GetActivePoliciesAsync();
        return Ok(policies);
    }

    /// <summary>
    /// Get a single policy by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PolicyResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPolicy(Guid id)
    {
        var policy = await _policyService.GetPolicyByIdAsync(id);
        if (policy is null)
        {
            return NotFound(new ErrorResponseDto("Policy not found."));
        }
        return Ok(policy);
    }

    /// <summary>
    /// Create a new policy.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PolicyResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreatePolicy([FromBody] CreatePolicyDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new ErrorResponseDto(GetFirstModelError()));
        }

        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(new ErrorResponseDto("Unable to determine user identity."));
        }

        try
        {
            var policy = await _policyService.CreatePolicyAsync(dto, userId.Value);

            _logger.LogInformation(
                "Policy {PolicyId} created by user {UserId}",
                policy.Id, userId.Value);

            await _auditLogService.LogActionAsync(
                userId.Value,
                GetUserEmail() ?? "unknown",
                "Create",
                "Policy",
                policy.Id,
                new { policy.Name, policy.ProgramId, policy.MinimumScore, policy.Status });

            return CreatedAtAction(nameof(GetPolicy), new { id = policy.Id }, policy);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ErrorResponseDto(ex.Message));
        }
    }

    /// <summary>
    /// Update an existing policy. Creates a new version.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(PolicyResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePolicy(Guid id, [FromBody] UpdatePolicyDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new ErrorResponseDto(GetFirstModelError()));
        }

        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(new ErrorResponseDto("Unable to determine user identity."));
        }

        try
        {
            var policy = await _policyService.UpdatePolicyAsync(id, dto, userId.Value);

            _logger.LogInformation(
                "Policy {PolicyId} updated by user {UserId}, version {Version}",
                policy.Id, userId.Value, policy.CurrentVersion);

            await _auditLogService.LogActionAsync(
                userId.Value,
                GetUserEmail() ?? "unknown",
                "Update",
                "Policy",
                policy.Id,
                new { policy.Name, policy.CurrentVersion, policy.Status });

            return Ok(policy);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new ErrorResponseDto("Policy not found."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ErrorResponseDto(ex.Message));
        }
    }

    /// <summary>
    /// Delete a policy.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePolicy(Guid id)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(new ErrorResponseDto("Unable to determine user identity."));
        }

        try
        {
            await _policyService.DeletePolicyAsync(id);

            _logger.LogInformation(
                "Policy {PolicyId} deleted by user {UserId}",
                id, userId.Value);

            await _auditLogService.LogActionAsync(
                userId.Value,
                GetUserEmail() ?? "unknown",
                "Delete",
                "Policy",
                id,
                new { PolicyId = id });

            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new ErrorResponseDto("Policy not found."));
        }
    }

    /// <summary>
    /// Get version history for a policy.
    /// </summary>
    [HttpGet("{id:guid}/versions")]
    [ProducesResponseType(typeof(List<PolicyVersionResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPolicyVersions(Guid id)
    {
        var policy = await _policyService.GetPolicyByIdAsync(id);
        if (policy is null)
        {
            return NotFound(new ErrorResponseDto("Policy not found."));
        }

        var versions = await _policyService.GetVersionsAsync(id);
        return Ok(versions);
    }

    private Guid? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (Guid.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        return null;
    }

    private string? GetUserEmail()
    {
        return User.FindFirst(ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value;
    }

    private string GetFirstModelError()
    {
        foreach (var entry in ModelState)
        {
            foreach (var error in entry.Value.Errors)
            {
                if (!string.IsNullOrWhiteSpace(error.ErrorMessage))
                {
                    return error.ErrorMessage;
                }
            }
        }
        return "Invalid request.";
    }
}