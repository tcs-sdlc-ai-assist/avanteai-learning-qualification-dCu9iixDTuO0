using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

public enum ProgramStatus
{
    Active,
    Inactive,
    Archived
}

public class ComplianceProgram
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public required string Name { get; set; }

    public string? Description { get; set; }

    [Required]
    [MaxLength(20)]
    public required string Status { get; set; }

    [Required]
    public Guid CreatedBy { get; set; }

    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Timestamp]
    public byte[]? RowVersion { get; set; }

    public ICollection<Policy> Policies { get; set; } = new List<Policy>();

    [NotMapped]
    public ProgramStatus StatusEnum
    {
        get => Enum.TryParse<ProgramStatus>(Status, true, out var result) ? result : ProgramStatus.Active;
        set => Status = value.ToString();
    }
}