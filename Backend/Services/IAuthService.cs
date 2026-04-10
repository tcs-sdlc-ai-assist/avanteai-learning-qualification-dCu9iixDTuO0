using Backend.DTOs;
using Backend.Models;

namespace Backend.Services;

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request);
    Task<LoginResponseDto> RegisterAsync(RegisterRequestDto request);
    string GenerateJwtToken(User user);
}