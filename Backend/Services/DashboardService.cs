using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Backend.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _context;
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(AppDbContext context, ILogger<DashboardService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(Guid userId, string role)
    {
        _logger.LogInformation("Fetching dashboard summary for user {UserId} with role {Role}", userId, role);

        var totalPrograms = await _context.Programs
            .AsNoTracking()
            .CountAsync();

        var totalEvidence = await _context.Evidence
            .AsNoTracking()
            .CountAsync();

        var totalExceptions = await _context.Exceptions
            .AsNoTracking()
            .CountAsync();

        var pendingExceptions = await _context.Exceptions
            .AsNoTracking()
            .Where(e => e.Status == ExceptionStatus.Open)
            .CountAsync();

        var resolvedExceptions = await _context.Exceptions
            .AsNoTracking()
            .Where(e => e.Status == ExceptionStatus.Approved || e.Status == ExceptionStatus.Overridden || e.Status == ExceptionStatus.Rejected)
            .CountAsync();

        var totalAlerts = await _context.Alerts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .CountAsync();

        var validatedEvidence = await _context.Evidence
            .AsNoTracking()
            .Where(e => e.Status == EvidenceStatus.Validated)
            .CountAsync();

        double complianceRate = totalEvidence > 0
            ? Math.Round((double)validatedEvidence / totalEvidence * 100, 2)
            : 0.0;

        return new DashboardSummaryDto
        {
            TotalPrograms = totalPrograms,
            TotalEvidence = totalEvidence,
            ComplianceRate = complianceRate,
            PendingExceptions = pendingExceptions,
            ResolvedExceptions = resolvedExceptions,
            TotalAlerts = totalAlerts
        };
    }

    public async Task<IReadOnlyList<ExceptionTrendDto>> GetExceptionTrendsAsync(Guid userId, string role)
    {
        _logger.LogInformation("Fetching exception trends for user {UserId} with role {Role}", userId, role);

        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

        var exceptions = await _context.Exceptions
            .AsNoTracking()
            .Where(e => e.CreatedAt >= thirtyDaysAgo)
            .ToListAsync();

        var trends = exceptions
            .GroupBy(e => e.CreatedAt.Date)
            .OrderBy(g => g.Key)
            .Select(g => new ExceptionTrendDto
            {
                Date = new DateTimeOffset(g.Key, TimeSpan.Zero),
                Count = g.Count(),
                OpenCount = g.Count(e => e.Status == ExceptionStatus.Open),
                ResolvedCount = g.Count(e => e.Status == ExceptionStatus.Approved || e.Status == ExceptionStatus.Overridden || e.Status == ExceptionStatus.Rejected),
                EscalatedCount = g.Count(e => e.Status == ExceptionStatus.Open && e.SlaDeadline < DateTime.UtcNow)
            })
            .ToList();

        // Fill in missing dates with zero counts
        var result = new List<ExceptionTrendDto>();
        var currentDate = thirtyDaysAgo.Date;
        var endDate = DateTime.UtcNow.Date;

        while (currentDate <= endDate)
        {
            var existing = trends.FirstOrDefault(t => t.Date.Date == currentDate);
            if (existing is not null)
            {
                result.Add(existing);
            }
            else
            {
                result.Add(new ExceptionTrendDto
                {
                    Date = new DateTimeOffset(currentDate, TimeSpan.Zero),
                    Count = 0,
                    OpenCount = 0,
                    ResolvedCount = 0,
                    EscalatedCount = 0
                });
            }
            currentDate = currentDate.AddDays(1);
        }

        return result;
    }

    public async Task<SlaMetricsDto> GetSlaMetricsAsync(Guid userId, string role)
    {
        _logger.LogInformation("Fetching SLA metrics for user {UserId} with role {Role}", userId, role);

        var allExceptions = await _context.Exceptions
            .AsNoTracking()
            .ToListAsync();

        var totalItems = allExceptions.Count;

        if (totalItems == 0)
        {
            return new SlaMetricsDto
            {
                OnTimePercentage = 0,
                BreachedPercentage = 0,
                PendingPercentage = 0,
                TotalItems = 0,
                OnTimeCount = 0,
                BreachedCount = 0,
                PendingCount = 0
            };
        }

        var now = DateTime.UtcNow;

        // On-time: resolved before SLA deadline
        var onTimeCount = allExceptions.Count(e =>
            (e.Status == ExceptionStatus.Approved || e.Status == ExceptionStatus.Overridden || e.Status == ExceptionStatus.Rejected)
            && e.ReviewedAt.HasValue
            && e.ReviewedAt.Value <= e.SlaDeadline);

        // Breached: SLA deadline passed and either still open or resolved after deadline
        var breachedCount = allExceptions.Count(e =>
            (e.Status == ExceptionStatus.Open && e.SlaDeadline < now)
            || ((e.Status == ExceptionStatus.Approved || e.Status == ExceptionStatus.Overridden || e.Status == ExceptionStatus.Rejected)
                && e.ReviewedAt.HasValue
                && e.ReviewedAt.Value > e.SlaDeadline));

        // Pending: still open and SLA not yet breached
        var pendingCount = allExceptions.Count(e =>
            e.Status == ExceptionStatus.Open && e.SlaDeadline >= now);

        return new SlaMetricsDto
        {
            OnTimePercentage = Math.Round((double)onTimeCount / totalItems * 100, 2),
            BreachedPercentage = Math.Round((double)breachedCount / totalItems * 100, 2),
            PendingPercentage = Math.Round((double)pendingCount / totalItems * 100, 2),
            TotalItems = totalItems,
            OnTimeCount = onTimeCount,
            BreachedCount = breachedCount,
            PendingCount = pendingCount
        };
    }

    public async Task<IReadOnlyList<OverdueTrainingDto>> GetOverdueTrainingAsync(Guid userId, string role)
    {
        _logger.LogInformation("Fetching overdue training for user {UserId} with role {Role}", userId, role);

        var now = DateTime.UtcNow;

        // Evidence records that are flagged or pending and have a completion date in the past
        // represent overdue training items
        var overdueEvidence = await _context.Evidence
            .AsNoTracking()
            .Where(e => e.Status == EvidenceStatus.Pending || e.Status == EvidenceStatus.Flagged)
            .Where(e => e.CompletionDate < now)
            .OrderBy(e => e.CompletionDate)
            .Take(100)
            .ToListAsync();

        var result = overdueEvidence.Select(e =>
        {
            var dueDate = new DateTimeOffset(e.CompletionDate, TimeSpan.Zero);
            var daysOverdue = (int)Math.Floor((now - e.CompletionDate).TotalDays);

            return new OverdueTrainingDto
            {
                EmployeeName = e.EmployeeName,
                CourseName = e.CourseName,
                DueDate = dueDate,
                DaysOverdue = Math.Max(0, daysOverdue)
            };
        }).ToList();

        return result;
    }
}