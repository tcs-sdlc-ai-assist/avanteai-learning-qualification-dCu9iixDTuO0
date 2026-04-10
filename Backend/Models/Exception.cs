using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

public enum ExceptionStatus
{
    Open,
    Approved,
    Overridden,
    Rejected
}

[Table("Exceptions")]
public class ComplianceException
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid EvidenceId { get; set; }

    [Required]
    [MaxLength(2000)]
    public string Reason { get; set; } = string.Empty;

    [Required]
    public ExceptionStatus Status { get; set; } = ExceptionStatus.Open;

    public Guid? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    [MaxLength(2000)]
    public string? Justification { get; set; }

    [Required]
    public DateTime SlaDeadline { get; set; }

    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(EvidenceId))]
    public Evidence Evidence { get; set; } = null!;
}