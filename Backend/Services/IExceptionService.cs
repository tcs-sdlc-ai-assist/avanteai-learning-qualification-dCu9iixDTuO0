using Backend.DTOs;

namespace Backend.Services;

public interface IExceptionService
{
    /// <summary>
    /// Retrieves a paginated list of open exceptions for the review queue.
    /// </summary>
    /// <param name="page">Page number (1-based).</param>
    /// <param name="pageSize">Number of items per page.</param>
    /// <returns>Paginated queue of open exceptions with SLA information.</returns>
    Task<ExceptionQueueResponseDto> GetOpenExceptionsAsync(int page = 1, int pageSize = 20);

    /// <summary>
    /// Retrieves a single exception by its ID.
    /// </summary>
    /// <param name="exceptionId">The unique identifier of the exception.</param>
    /// <returns>The exception details, or null if not found.</returns>
    Task<ExceptionResponseDto?> GetExceptionByIdAsync(Guid exceptionId);

    /// <summary>
    /// Submits a review action (Approved, Overridden, or Rejected) for an open exception.
    /// </summary>
    /// <param name="review">The review action details including exception ID, action, and optional justification.</param>
    /// <param name="reviewerId">The ID of the user performing the review.</param>
    /// <returns>The result of the review action.</returns>
    Task<ExceptionReviewResultDto> ReviewExceptionAsync(ExceptionReviewDto review, Guid reviewerId);

    /// <summary>
    /// Retrieves a paginated and optionally filtered exception queue.
    /// </summary>
    /// <param name="status">Optional status filter (Open, Approved, Overridden, Rejected).</param>
    /// <param name="page">Page number (1-based).</param>
    /// <param name="pageSize">Number of items per page.</param>
    /// <returns>Paginated list of exceptions matching the filter criteria.</returns>
    Task<ExceptionQueueResponseDto> GetQueueAsync(string? status = null, int page = 1, int pageSize = 20);
}