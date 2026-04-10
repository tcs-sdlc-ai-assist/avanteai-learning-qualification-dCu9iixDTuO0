using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("AuditLogs")]
public class AuditLog
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(256)]
    public required string UserEmail { get; set; }

    [Required]
    [MaxLength(64)]
    public required string Action { get; set; }

    [Required]
    [MaxLength(64)]
    public required string Entity { get; set; }

    public Guid? EntityId { get; set; }

    public string? Details { get; set; }

    [Required]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}