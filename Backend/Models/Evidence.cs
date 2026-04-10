using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

public enum ConfidenceLevel
{
    High,
    Medium,
    Low
}

public enum EvidenceStatus
{
    Pending,
    Validated,
    Flagged,
    Rejected
}

public class Evidence
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(32)]
    public required string EmployeeId { get; set; }

    [Required]
    [MaxLength(200)]
    public required string EmployeeName { get; set; }

    [Required]
    [MaxLength(300)]
    public required string CourseName { get; set; }

    [Required]
    public DateTime CompletionDate { get; set; }

    [Required]
    [Range(0, 100)]
    public int Score { get; set; }

    public Guid? PolicyId { get; set; }

    [Required]
    public ConfidenceLevel ConfidenceLevel { get; set; } = ConfidenceLevel.Medium;

    [Required]
    public EvidenceStatus Status { get; set; } = EvidenceStatus.Pending;

    [Required]
    public Guid UploadedBy { get; set; }

    [Required]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ValidatedAt { get; set; }
}