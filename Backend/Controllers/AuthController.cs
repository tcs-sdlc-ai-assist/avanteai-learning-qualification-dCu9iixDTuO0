using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.DTOs;
using Backend.Services;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// Authenticates a user and returns a JWT token.
    /// </summary>
    /// <param name="request">Login credentials (email and password).</param>
    /// <returns>JWT token, expiration, and user info.</returns>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new ErrorResponseDto("Invalid login request."));
        }

        try
        {
            var result = await _authService.LoginAsync(request);
            _logger.LogInformation("User {Email} logged in successfully.", request.Email);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning("Failed login attempt for {Email}: {Message}", request.Email, ex.Message);
            return Unauthorized(new ErrorResponseDto("Invalid email or password."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during login for {Email}.", request.Email);
            return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponseDto("An unexpected error occurred."));
        }
    }

    /// <summary>
    /// Registers a new user. Only accessible by Admin users.
    /// </summary>
    /// <param name="request">Registration details (email, password, full name, optional role).</param>
    /// <returns>JWT token, expiration, and user info for the newly created user.</returns>
    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new ErrorResponseDto("Invalid registration request."));
        }

        try
        {
            var result = await _authService.RegisterAsync(request);
            _logger.LogInformation("New user {Email} registered successfully by admin.", request.Email);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Registration failed for {Email}: {Message}", request.Email, ex.Message);
            return Conflict(new ErrorResponseDto(ex.Message));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid registration data for {Email}: {Message}", request.Email, ex.Message);
            return BadRequest(new ErrorResponseDto(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during registration for {Email}.", request.Email);
            return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponseDto("An unexpected error occurred."));
        }
    }

    /// <summary>
    /// Returns the current authenticated user's information.
    /// </summary>
    /// <returns>User info for the authenticated user.</returns>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserInfoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public IActionResult Me()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        var userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value;
        var userFullName = User.FindFirst(System.Security.Claims.ClaimTypes.GivenName)?.Value
            ?? User.FindFirst("fullName")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
        var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value;

        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(userEmail))
        {
            return Unauthorized();
        }

        var userInfo = new UserInfoDto
        {
            Id = userId,
            Email = userEmail,
            FullName = userFullName ?? string.Empty,
            Role = userRole ?? string.Empty
        };

        return Ok(userInfo);
    }
}