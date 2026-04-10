using Backend.DTOs;
using Microsoft.AspNetCore.Http;

namespace Backend.Services;

public interface IEvidenceService
{
    /// <summary>
    /// Uploads and parses a CSV/Excel file, performs deduplication against existing records,
    /// and returns a preview of parsed records with deduplication info.
    /// </summary>
    /// <param name="file">The uploaded CSV or Excel file.</param>
    /// <param name="uploadedBy">The ID of the user performing the upload.</param>
    /// <returns>Parsed records with deduplication counts.</returns>
    Task<EvidenceUploadResponseDto> UploadEvidenceAsync(IFormFile file, Guid uploadedBy);

    /// <summary>
    /// Confirms and persists previously uploaded evidence records.
    /// </summary>
    /// <param name="evidenceIds">List of evidence IDs to confirm.</param>
    /// <param name="confirmedBy">The ID of the user confirming the records.</param>
    /// <returns>List of confirmed evidence records.</returns>
    Task<List<EvidenceResponseDto>> ConfirmEvidenceAsync(List<Guid> evidenceIds, Guid confirmedBy);

    /// <summary>
    /// Triggers simulated AI validation for the specified evidence records.
    /// Flags exceptions for low-confidence results and updates evidence status.
    /// </summary>
    /// <param name="evidenceIds">List of evidence IDs to validate.</param>
    /// <param name="validatedBy">The ID of the user triggering validation.</param>
    /// <returns>Validation results including flagged exceptions.</returns>
    Task<EvidenceValidateResponseDto> ValidateEvidenceAsync(List<int> evidenceIds, Guid validatedBy);

    /// <summary>
    /// Retrieves a paginated list of evidence records with optional filtering.
    /// </summary>
    /// <param name="page">Page number (1-based).</param>
    /// <param name="pageSize">Number of records per page.</param>
    /// <param name="status">Optional status filter.</param>
    /// <param name="employeeId">Optional employee ID filter.</param>
    /// <param name="programId">Optional program ID filter.</param>
    /// <returns>Paginated list of evidence records.</returns>
    Task<EvidenceListResponseDto> GetEvidenceAsync(int page, int pageSize, string? status = null, string? employeeId = null, Guid? programId = null);

    /// <summary>
    /// Retrieves a single evidence record by its ID.
    /// </summary>
    /// <param name="evidenceId">The evidence ID.</param>
    /// <returns>The evidence record, or null if not found.</returns>
    Task<EvidenceResponseDto?> GetEvidenceByIdAsync(Guid evidenceId);
}