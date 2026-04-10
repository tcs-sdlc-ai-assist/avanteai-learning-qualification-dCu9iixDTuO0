using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public enum UserRole
{
    LearningManager,
    QualificationsTeam,
    SharedServices,
    Auditor,
    Admin
}

public class User
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(256)]
    public required string Email { get; set; }

    [Required]
    [MaxLength(512)]
    public required string PasswordHash { get; set; }

    [Required]
    [MaxLength(200)]
    public required string FullName { get; set; }

    [Required]
    public UserRole Role { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsActive { get; set; } = true;
}