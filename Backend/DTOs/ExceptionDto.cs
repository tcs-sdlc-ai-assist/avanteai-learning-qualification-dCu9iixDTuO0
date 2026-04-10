using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class ExceptionResponseDto
{
    public int ExceptionId { get; set; }
    public int EvidenceId { get; set; }
    public string EmployeeId { get; set; } = string.Empty;
    public int ProgramId { get; set; }
    public DateTime CompletionDate { get; set; }
    public int Score { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SLADeadline { get; set; }
    public double SLARemainingHours { get; set; }
    public bool IsSLABreached { get; set; }
    public string? ReviewerId { get; set; }
    public string? ReviewAction { get; set; }
    public string? Justification { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ExceptionReviewDto
{
    [Required(ErrorMessage = "ExceptionId is required.")]
    public int ExceptionId { get; set; }

    [Required(ErrorMessage = "Action is required.")]
    [RegularExpression("^(Approved|Overridden|Rejected)$", ErrorMessage = "Action must be 'Approved', 'Overridden', or 'Rejected'.")]
    public string Action { get; set; } = string.Empty;

    public string? Justification { get; set; }
}

public class ExceptionQueueResponseDto
{
    public List<ExceptionResponseDto> Exceptions { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

public class ExceptionReviewResultDto
{
    public int ExceptionId { get; set; }
    public string Status { get; set; } = string.Empty;
}