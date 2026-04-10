using Backend.DTOs;

namespace Backend.Services;

public interface IProgramService
{
    Task<List<ProgramResponseDto>> GetAllAsync();
    Task<ProgramResponseDto?> GetByIdAsync(Guid id);
    Task<ProgramResponseDto> CreateAsync(CreateProgramDto dto, Guid userId);
    Task<ProgramResponseDto> UpdateAsync(Guid id, UpdateProgramDto dto);
    Task DeleteAsync(Guid id);
}