using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

public class PolicyVersion
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid PolicyId { get; set; }

    [Required]
    public int VersionNumber { get; set; }

    [Required]
    [Column(TypeName = "jsonb")]
    public string Rules { get; set; } = string.Empty;

    [Required]
    public Guid CreatedBy { get; set; }

    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(PolicyId))]
    public Policy Policy { get; set; } = null!;
}