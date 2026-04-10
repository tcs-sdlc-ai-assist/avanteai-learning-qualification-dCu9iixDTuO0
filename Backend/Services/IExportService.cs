using Backend.DTOs;

namespace Backend.Services;

public interface IExportService
{
    Task<ExportResponseDto> ExportDataAsync(ExportRequestDto request, Guid userId);
}