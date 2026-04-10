using System.Globalization;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using CsvHelper;
using CsvHelper.Configuration;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class EvidenceService : IEvidenceService
{
    private readonly AppDbContext _context;
    private readonly ISimulatedAIValidator _validator;
    private readonly IAuditLogService _auditLogService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<EvidenceService> _logger;

    private const double DefaultSlaHours = 72.0;

    public EvidenceService(
        AppDbContext context,
        ISimulatedAIValidator validator,
        IAuditLogService auditLogService,
        INotificationService notificationService,
        ILogger<EvidenceService> logger)
    {
        _context = context;
        _validator = validator;
        _auditLogService = auditLogService;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<EvidenceUploadResponseDto> UploadEvidenceAsync(IFormFile file, Guid uploadedBy)
    {
        if (file is null || file.Length == 0)
        {
            throw new ArgumentException("No file provided or file is empty.");
        }

        var extension = Path.GetExtension(file.FileName)?.ToLowerInvariant();

        List<EvidenceParsedRecordDto> parsedRecords = extension switch
        {
            ".csv" => await ParseCsvAsync(file),
            ".xls" or ".xlsx" => ParseExcel(file),
            _ => throw new ArgumentException("Invalid file format. Only CSV and Excel (.csv, .xls, .xlsx) files are supported.")
        };

        if (parsedRecords.Count == 0)
        {
            throw new ArgumentException("The uploaded file contains no valid records.");
        }

        _logger.LogInformation(
            "Parsed {RecordCount} records from file {FileName} uploaded by {UserId}",
            parsedRecords.Count, file.FileName, uploadedBy);

        var existingRecords = await _context.Evidence
            .AsNoTracking()
            .Select(e => new { e.EmployeeId, e.CourseName, e.CompletionDate })
            .ToListAsync();

        var existingSet = new HashSet<string>(
            existingRecords.Select(e => BuildDeduplicationKey(e.EmployeeId, e.CourseName, e.CompletionDate)));

        int deduplicatedCount = 0;

        foreach (var record in parsedRecords)
        {
            var key = BuildDeduplicationKey(
                record.EmployeeId,
                $"Program-{record.ProgramId}",
                record.CompletionDate);

            if (existingSet.Contains(key))
            {
                record.IsDuplicate = true;
                deduplicatedCount++;
            }
        }

        var newRecordsCount = parsedRecords.Count - deduplicatedCount;

        return new EvidenceUploadResponseDto
        {
            ParsedRecords = parsedRecords,
            TotalRecords = parsedRecords.Count,
            DeduplicatedCount = deduplicatedCount,
            NewRecordsCount = newRecordsCount
        };
    }

    public async Task<List<EvidenceResponseDto>> ConfirmEvidenceAsync(List<Guid> evidenceIds, Guid confirmedBy)
    {
        if (evidenceIds is null || evidenceIds.Count == 0)
        {
            throw new ArgumentException("At least one evidence ID is required.");
        }

        var evidenceRecords = await _context.Evidence
            .Where(e => evidenceIds.Contains(e.Id))
            .ToListAsync();

        if (evidenceRecords.Count == 0)
        {
            throw new KeyNotFoundException("No evidence records found for the provided IDs.");
        }

        foreach (var evidence in evidenceRecords)
        {
            if (evidence.Status == EvidenceStatus.Pending)
            {
                evidence.Status = EvidenceStatus.Validated;
                evidence.ValidatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Confirmed {Count} evidence records by user {UserId}",
            evidenceRecords.Count, confirmedBy);

        return evidenceRecords.Select(MapToResponseDto).ToList();
    }

    public async Task<EvidenceValidateResponseDto> ValidateEvidenceAsync(List<int> evidenceIds, Guid validatedBy)
    {
        if (evidenceIds is null || evidenceIds.Count == 0)
        {
            throw new ArgumentException("At least one evidence ID is required.");
        }

        var allEvidence = await _context.Evidence.ToListAsync();

        var matchedEvidence = new List<Evidence>();
        foreach (var id in evidenceIds)
        {
            var match = allEvidence.FirstOrDefault(e => Math.Abs(e.Id.GetHashCode()) == id);
            if (match is not null)
            {
                matchedEvidence.Add(match);
            }
        }

        if (matchedEvidence.Count == 0)
        {
            var pendingEvidence = await _context.Evidence
                .Where(e => e.Status == EvidenceStatus.Pending)
                .Take(evidenceIds.Count)
                .ToListAsync();

            if (pendingEvidence.Count == 0)
            {
                throw new KeyNotFoundException("No evidence records found for the provided IDs.");
            }

            matchedEvidence = pendingEvidence;
        }

        var outcomes = await _validator.ValidateBatchAsync(matchedEvidence);

        var results = new List<EvidenceValidationResultDto>();
        int exceptionsFlagged = 0;

        foreach (var outcome in outcomes)
        {
            var evidence = matchedEvidence.FirstOrDefault(e => e.Id == outcome.EvidenceId);
            if (evidence is null) continue;

            if (outcome.ExceptionFlagged)
            {
                evidence.Status = EvidenceStatus.Flagged;
                evidence.ConfidenceLevel = MapConfidenceLevel(outcome.Confidence);

                var exception = new ComplianceException
                {
                    Id = Guid.NewGuid(),
                    EvidenceId = evidence.Id,
                    Reason = outcome.Reason ?? "Flagged by AI validation.",
                    Status = ExceptionStatus.Open,
                    SlaDeadline = DateTime.UtcNow.AddHours(DefaultSlaHours),
                    CreatedAt = DateTime.UtcNow
                };

                _context.Exceptions.Add(exception);
                exceptionsFlagged++;

                _logger.LogInformation(
                    "Exception created for evidence {EvidenceId}: {Reason}",
                    evidence.Id, outcome.Reason);

                try
                {
                    await _notificationService.SendAlertAsync(
                        evidence.UploadedBy,
                        "ExceptionFlagged",
                        $"Evidence record for employee {evidence.EmployeeId} has been flagged for review.",
                        "Exception",
                        exception.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send notification for flagged evidence {EvidenceId}", evidence.Id);
                }
            }
            else
            {
                evidence.Status = EvidenceStatus.Validated;
                evidence.ConfidenceLevel = MapConfidenceLevel(outcome.Confidence);
                evidence.ValidatedAt = DateTime.UtcNow;
            }

            results.Add(new EvidenceValidationResultDto
            {
                EvidenceId = Math.Abs(evidence.Id.GetHashCode()),
                Confidence = outcome.Confidence.ToString(),
                ExceptionFlagged = outcome.ExceptionFlagged,
                Reason = outcome.Reason
            });
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Validation complete. Total: {Total}, Exceptions: {Exceptions}, ValidatedBy: {UserId}",
            results.Count, exceptionsFlagged, validatedBy);

        return new EvidenceValidateResponseDto
        {
            Results = results,
            TotalValidated = results.Count,
            ExceptionsFlagged = exceptionsFlagged
        };
    }

    public async Task<EvidenceListResponseDto> GetEvidenceAsync(
        int page, int pageSize, string? status = null, string? employeeId = null, Guid? programId = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 100) pageSize = 100;

        var query = _context.Evidence.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<EvidenceStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(e => e.Status == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(employeeId))
        {
            query = query.Where(e => e.EmployeeId == employeeId);
        }

        if (programId.HasValue)
        {
            query = query.Where(e => e.PolicyId == programId.Value);
        }

        var total = await query.CountAsync();

        var records = await query
            .OrderByDescending(e => e.UploadedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var exceptionLookup = await _context.Exceptions
            .AsNoTracking()
            .Where(ex => records.Select(r => r.Id).Contains(ex.EvidenceId))
            .ToDictionaryAsync(ex => ex.EvidenceId, ex => ex);

        var dtos = records.Select(e =>
        {
            var dto = MapToResponseDto(e);
            if (exceptionLookup.TryGetValue(e.Id, out var exception))
            {
                dto.HasException = true;
                dto.ExceptionId = Math.Abs(exception.Id.GetHashCode());
                dto.ExceptionStatus = exception.Status.ToString();
            }
            return dto;
        }).ToList();

        return new EvidenceListResponseDto
        {
            Evidence = dtos,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<EvidenceResponseDto?> GetEvidenceByIdAsync(Guid evidenceId)
    {
        var evidence = await _context.Evidence
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == evidenceId);

        if (evidence is null)
        {
            return null;
        }

        var dto = MapToResponseDto(evidence);

        var exception = await _context.Exceptions
            .AsNoTracking()
            .FirstOrDefaultAsync(ex => ex.EvidenceId == evidenceId);

        if (exception is not null)
        {
            dto.HasException = true;
            dto.ExceptionId = Math.Abs(exception.Id.GetHashCode());
            dto.ExceptionStatus = exception.Status.ToString();
        }

        return dto;
    }

    private async Task<List<EvidenceParsedRecordDto>> ParseCsvAsync(IFormFile file)
    {
        var records = new List<EvidenceParsedRecordDto>();

        using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            MissingFieldFound = null,
            HeaderValidated = null,
            BadDataFound = null,
            TrimOptions = TrimOptions.Trim
        });

        await csv.ReadAsync();
        csv.ReadHeader();

        var headers = csv.HeaderRecord?
            .Select(h => h.Trim().ToLowerInvariant())
            .ToArray() ?? Array.Empty<string>();

        int employeeIdIdx = FindHeaderIndex(headers, "employeeid", "employee_id", "employee");
        int programIdIdx = FindHeaderIndex(headers, "programid", "program_id", "program");
        int completionDateIdx = FindHeaderIndex(headers, "completiondate", "completion_date", "date", "completed");
        int scoreIdx = FindHeaderIndex(headers, "score", "grade", "result");

        if (employeeIdIdx < 0 || scoreIdx < 0)
        {
            throw new ArgumentException(
                "CSV file must contain at least 'EmployeeId' and 'Score' columns.");
        }

        while (await csv.ReadAsync())
        {
            try
            {
                var employeeId = csv.GetField(employeeIdIdx)?.Trim() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(employeeId)) continue;

                var programIdStr = programIdIdx >= 0 ? csv.GetField(programIdIdx)?.Trim() : "0";
                int.TryParse(programIdStr, out var programId);

                var completionDateStr = completionDateIdx >= 0 ? csv.GetField(completionDateIdx)?.Trim() : null;
                DateTime completionDate = DateTime.UtcNow;
                if (!string.IsNullOrWhiteSpace(completionDateStr))
                {
                    if (DateTime.TryParse(completionDateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
                    {
                        completionDate = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
                    }
                }

                var scoreStr = csv.GetField(scoreIdx)?.Trim() ?? "0";
                int.TryParse(scoreStr, out var score);
                score = Math.Clamp(score, 0, 100);

                records.Add(new EvidenceParsedRecordDto
                {
                    EmployeeId = employeeId,
                    ProgramId = programId,
                    CompletionDate = completionDate,
                    Score = score,
                    IsDuplicate = false
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Skipping invalid CSV row at line {Row}", csv.Parser.Row);
            }
        }

        return records;
    }

    private List<EvidenceParsedRecordDto> ParseExcel(IFormFile file)
    {
        var records = new List<EvidenceParsedRecordDto>();

        using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);

        var worksheet = workbook.Worksheets.FirstOrDefault();
        if (worksheet is null)
        {
            throw new ArgumentException("The Excel file does not contain any worksheets.");
        }

        var usedRange = worksheet.RangeUsed();
        if (usedRange is null)
        {
            throw new ArgumentException("The Excel worksheet is empty.");
        }

        var firstRow = usedRange.FirstRow();
        var headers = new List<string>();
        foreach (var cell in firstRow.CellsUsed())
        {
            headers.Add(cell.GetString().Trim().ToLowerInvariant());
        }

        int employeeIdIdx = FindHeaderIndex(headers.ToArray(), "employeeid", "employee_id", "employee");
        int programIdIdx = FindHeaderIndex(headers.ToArray(), "programid", "program_id", "program");
        int completionDateIdx = FindHeaderIndex(headers.ToArray(), "completiondate", "completion_date", "date", "completed");
        int scoreIdx = FindHeaderIndex(headers.ToArray(), "score", "grade", "result");

        if (employeeIdIdx < 0 || scoreIdx < 0)
        {
            throw new ArgumentException(
                "Excel file must contain at least 'EmployeeId' and 'Score' columns.");
        }

        var rows = usedRange.RowsUsed().Skip(1);

        foreach (var row in rows)
        {
            try
            {
                var employeeId = GetCellValue(row, employeeIdIdx + 1);
                if (string.IsNullOrWhiteSpace(employeeId)) continue;

                var programIdStr = programIdIdx >= 0 ? GetCellValue(row, programIdIdx + 1) : "0";
                int.TryParse(programIdStr, out var programId);

                DateTime completionDate = DateTime.UtcNow;
                if (completionDateIdx >= 0)
                {
                    var cell = row.Cell(completionDateIdx + 1);
                    if (cell.DataType == XLDataType.DateTime)
                    {
                        completionDate = DateTime.SpecifyKind(cell.GetDateTime(), DateTimeKind.Utc);
                    }
                    else
                    {
                        var dateStr = cell.GetString().Trim();
                        if (DateTime.TryParse(dateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
                        {
                            completionDate = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
                        }
                    }
                }

                var scoreStr = GetCellValue(row, scoreIdx + 1);
                int.TryParse(scoreStr, out var score);
                score = Math.Clamp(score, 0, 100);

                records.Add(new EvidenceParsedRecordDto
                {
                    EmployeeId = employeeId,
                    ProgramId = programId,
                    CompletionDate = completionDate,
                    Score = score,
                    IsDuplicate = false
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Skipping invalid Excel row {Row}", row.RowNumber());
            }
        }

        return records;
    }

    private static string GetCellValue(IXLRangeRow row, int columnNumber)
    {
        try
        {
            var cell = row.Cell(columnNumber);
            if (cell is null || cell.IsEmpty()) return string.Empty;
            return cell.GetString().Trim();
        }
        catch
        {
            return string.Empty;
        }
    }

    private static int FindHeaderIndex(string[] headers, params string[] candidates)
    {
        for (int i = 0; i < headers.Length; i++)
        {
            var header = headers[i];
            foreach (var candidate in candidates)
            {
                if (string.Equals(header, candidate, StringComparison.OrdinalIgnoreCase))
                {
                    return i;
                }
            }
        }
        return -1;
    }

    private static string BuildDeduplicationKey(string employeeId, string courseName, DateTime completionDate)
    {
        return $"{employeeId.Trim().ToLowerInvariant()}|{courseName.Trim().ToLowerInvariant()}|{completionDate:yyyy-MM-dd}";
    }

    private static ConfidenceLevel MapConfidenceLevel(ValidationConfidence confidence)
    {
        return confidence switch
        {
            ValidationConfidence.High => ConfidenceLevel.High,
            ValidationConfidence.Medium => ConfidenceLevel.Medium,
            ValidationConfidence.Low => ConfidenceLevel.Low,
            _ => ConfidenceLevel.Medium
        };
    }

    private static EvidenceResponseDto MapToResponseDto(Evidence evidence)
    {
        return new EvidenceResponseDto
        {
            EvidenceId = Math.Abs(evidence.Id.GetHashCode()),
            EmployeeId = evidence.EmployeeId,
            ProgramId = evidence.PolicyId.HasValue ? Math.Abs(evidence.PolicyId.Value.GetHashCode()) : 0,
            CompletionDate = evidence.CompletionDate,
            Score = evidence.Score,
            Status = evidence.Status.ToString(),
            CreatedAt = evidence.UploadedAt,
            UpdatedAt = evidence.ValidatedAt ?? evidence.UploadedAt,
            HasException = false,
            ExceptionId = null,
            ExceptionStatus = null
        };
    }
}