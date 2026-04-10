using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Backend.Services;

public class ExceptionService : IExceptionService
{
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<ExceptionService> _logger;

    private const double DefaultSlaHours = 72.0;

    public ExceptionService(
        AppDbContext context,
        IAuditLogService auditLogService,
        INotificationService notificationService,
        ILogger<ExceptionService> logger)
    {
        _context = context;
        _auditLogService = auditLogService;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<ExceptionQueueResponseDto> GetOpenExceptionsAsync(int page = 1, int pageSize = 20)
    {
        return await GetQueueAsync("Open", page, pageSize);
    }

    public async Task<ExceptionResponseDto?> GetExceptionByIdAsync(Guid exceptionId)
    {
        var exception = await _context.Exceptions
            .AsNoTracking()
            .Include(e => e.Evidence)
            .FirstOrDefaultAsync(e => e.Id == exceptionId);

        if (exception is null)
        {
            return null;
        }

        return MapToResponseDto(exception);
    }

    public async Task<ExceptionReviewResultDto> ReviewExceptionAsync(ExceptionReviewDto review, Guid reviewerId)
    {
        var exception = await _context.Exceptions
            .Include(e => e.Evidence)
            .FirstOrDefaultAsync(e => e.Id == Guid.Parse(review.ExceptionId.ToString()));

        if (exception is null)
        {
            throw new KeyNotFoundException($"Exception with ID {review.ExceptionId} not found.");
        }

        if (exception.Status != ExceptionStatus.Open)
        {
            throw new InvalidOperationException($"Exception {review.ExceptionId} is not in Open status. Current status: {exception.Status}.");
        }

        if (string.Equals(review.Action, "Overridden", StringComparison.OrdinalIgnoreCase) &&
            string.IsNullOrWhiteSpace(review.Justification))
        {
            throw new ArgumentException("Justification is required for Override action.");
        }

        var newStatus = review.Action switch
        {
            "Approved" => ExceptionStatus.Approved,
            "Overridden" => ExceptionStatus.Overridden,
            "Rejected" => ExceptionStatus.Rejected,
            _ => throw new ArgumentException($"Invalid review action: {review.Action}. Must be 'Approved', 'Overridden', or 'Rejected'.")
        };

        exception.Status = newStatus;
        exception.ReviewedBy = reviewerId;
        exception.ReviewedAt = DateTime.UtcNow;
        exception.Justification = review.Justification;

        if (newStatus == ExceptionStatus.Approved || newStatus == ExceptionStatus.Overridden)
        {
            if (exception.Evidence is not null)
            {
                exception.Evidence.Status = EvidenceStatus.Validated;
                exception.Evidence.ValidatedAt = DateTime.UtcNow;
            }
        }
        else if (newStatus == ExceptionStatus.Rejected)
        {
            if (exception.Evidence is not null)
            {
                exception.Evidence.Status = EvidenceStatus.Rejected;
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Exception {ExceptionId} reviewed by {ReviewerId} with action {Action}",
            exception.Id, reviewerId, review.Action);

        try
        {
            var reviewer = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == reviewerId);

            var reviewerEmail = reviewer?.Email ?? "unknown";

            await _auditLogService.LogActionAsync(
                reviewerId,
                reviewerEmail,
                "ReviewException",
                "Exception",
                exception.Id,
                new
                {
                    ExceptionId = exception.Id,
                    Action = review.Action,
                    Justification = review.Justification,
                    EvidenceId = exception.EvidenceId,
                    PreviousStatus = "Open",
                    NewStatus = newStatus.ToString()
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log audit for exception review {ExceptionId}", exception.Id);
        }

        try
        {
            if (exception.Evidence is not null)
            {
                await _notificationService.SendAlertAsync(
                    exception.Evidence.UploadedBy,
                    "ExceptionReviewed",
                    $"Exception for evidence record has been {newStatus}.",
                    "Exception",
                    exception.Id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send notification for exception review {ExceptionId}", exception.Id);
        }

        return new ExceptionReviewResultDto
        {
            ExceptionId = review.ExceptionId,
            Status = newStatus.ToString()
        };
    }

    public async Task<ExceptionQueueResponseDto> GetQueueAsync(string? status = null, int page = 1, int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = _context.Exceptions
            .AsNoTracking()
            .Include(e => e.Evidence)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (Enum.TryParse<ExceptionStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(e => e.Status == parsedStatus);
            }
            else
            {
                return new ExceptionQueueResponseDto
                {
                    Exceptions = new List<ExceptionResponseDto>(),
                    Total = 0,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = 0
                };
            }
        }

        var total = await query.CountAsync();
        var totalPages = (int)Math.Ceiling((double)total / pageSize);

        var exceptions = await query
            .OrderBy(e => e.SlaDeadline)
            .ThenByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = exceptions.Select(MapToResponseDto).ToList();

        return new ExceptionQueueResponseDto
        {
            Exceptions = dtos,
            Total = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    private static ExceptionResponseDto MapToResponseDto(ComplianceException exception)
    {
        var now = DateTime.UtcNow;
        var slaRemainingMs = (exception.SlaDeadline - now).TotalHours;
        var isSlaBreached = now > exception.SlaDeadline && exception.Status == ExceptionStatus.Open;

        return new ExceptionResponseDto
        {
            ExceptionId = GetIntHashFromGuid(exception.Id),
            EvidenceId = GetIntHashFromGuid(exception.EvidenceId),
            EmployeeId = exception.Evidence?.EmployeeId ?? string.Empty,
            ProgramId = 0,
            CompletionDate = exception.Evidence?.CompletionDate ?? DateTime.MinValue,
            Score = exception.Evidence?.Score ?? 0,
            Reason = exception.Reason,
            Status = exception.Status.ToString(),
            SLADeadline = exception.SlaDeadline,
            SLARemainingHours = Math.Round(slaRemainingMs, 2),
            IsSLABreached = isSlaBreached,
            ReviewerId = exception.ReviewedBy?.ToString(),
            ReviewAction = exception.Status == ExceptionStatus.Open ? null : exception.Status.ToString(),
            Justification = exception.Justification,
            ReviewedAt = exception.ReviewedAt,
            CreatedAt = exception.CreatedAt
        };
    }

    private static int GetIntHashFromGuid(Guid id)
    {
        return Math.Abs(id.GetHashCode());
    }
}