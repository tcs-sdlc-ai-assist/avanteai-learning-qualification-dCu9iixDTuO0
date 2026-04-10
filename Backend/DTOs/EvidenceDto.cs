using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class EvidenceParsedRecordDto
{
    public string EmployeeId { get; set; } = string.Empty;
    public int ProgramId { get; set; }
    public DateTime CompletionDate { get; set; }
    public int Score { get; set; }
    public bool IsDuplicate { get; set; }
}

public class EvidenceUploadResponseDto
{
    public List<EvidenceParsedRecordDto> ParsedRecords { get; set; } = new();
    public int TotalRecords { get; set; }
    public int DeduplicatedCount { get; set; }
    public int NewRecordsCount { get; set; }
}

public class EvidenceValidateRequestDto
{
    [Required]
    [MinLength(1, ErrorMessage = "At least one evidence ID is required.")]
    public List<int> EvidenceIds { get; set; } = new();
}

public class EvidenceValidationResultDto
{
    public int EvidenceId { get; set; }
    public string Confidence { get; set; } = string.Empty;
    public bool ExceptionFlagged { get; set; }
    public string? Reason { get; set; }
}

public class EvidenceValidateResponseDto
{
    public List<EvidenceValidationResultDto> Results { get; set; } = new();
    public int TotalValidated { get; set; }
    public int ExceptionsFlagged { get; set; }
}

public class EvidenceResponseDto
{
    public int EvidenceId { get; set; }
    public string EmployeeId { get; set; } = string.Empty;
    public int ProgramId { get; set; }
    public DateTime CompletionDate { get; set; }
    public int Score { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool HasException { get; set; }
    public int? ExceptionId { get; set; }
    public string? ExceptionStatus { get; set; }
}

public class EvidenceListResponseDto
{
    public List<EvidenceResponseDto> Evidence { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class ErrorResponseDto
{
    public string Error { get; set; } = string.Empty;
    public string? CorrelationId { get; set; }

    public ErrorResponseDto() { }

    public ErrorResponseDto(string error, string? correlationId = null)
    {
        Error = error;
        CorrelationId = correlationId;
    }
}