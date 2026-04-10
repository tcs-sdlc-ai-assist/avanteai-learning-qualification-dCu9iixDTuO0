using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

public enum PolicyStatus
{
    Draft,
    Active,
    Deprecated
}

public class Policy
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid ProgramId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Range(0, 100)]
    public int MinimumScore { get; set; }

    [Required]
    public bool RetakeAllowed { get; set; }

    [Range(0, int.MaxValue)]
    public int MaxRetakes { get; set; }

    [Required]
    public bool ExemptionAllowed { get; set; }

    [Required]
    public PolicyStatus Status { get; set; } = PolicyStatus.Draft;

    [Required]
    public int CurrentVersion { get; set; } = 1;

    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ConcurrencyCheck]
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    [ForeignKey(nameof(ProgramId))]
    public Program Program { get; set; } = null!;

    public ICollection<PolicyVersion> PolicyVersions { get; set; } = new List<PolicyVersion>();
}