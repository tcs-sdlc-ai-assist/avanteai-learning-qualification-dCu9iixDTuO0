using Backend.DTOs;

namespace Backend.Services;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(Guid userId, string role);

    Task<IReadOnlyList<ExceptionTrendDto>> GetExceptionTrendsAsync(Guid userId, string role);

    Task<SlaMetricsDto> GetSlaMetricsAsync(Guid userId, string role);

    Task<IReadOnlyList<OverdueTrainingDto>> GetOverdueTrainingAsync(Guid userId, string role);
}