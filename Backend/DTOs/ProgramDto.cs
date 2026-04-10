using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public enum ProgramStatus
{
    Active,
    Inactive,
    Archived
}

public class CreateProgramDto
{
    [Required(ErrorMessage = "Program name is required.")]
    [MaxLength(100, ErrorMessage = "Program name must not exceed 100 characters.")]
    public required string Name { get; set; }

    [MaxLength(2000, ErrorMessage = "Description must not exceed 2000 characters.")]
    public string? Description { get; set; }
}

public class UpdateProgramDto
{
    [Required(ErrorMessage = "Program name is required.")]
    [MaxLength(100, ErrorMessage = "Program name must not exceed 100 characters.")]
    public required string Name { get; set; }

    [MaxLength(2000, ErrorMessage = "Description must not exceed 2000 characters.")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Status is required.")]
    [EnumDataType(typeof(ProgramStatus), ErrorMessage = "Status must be one of: Active, Inactive, Archived.")]
    public required ProgramStatus Status { get; set; }
}

public class ProgramResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProgramStatus Status { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int PolicyCount { get; set; }
}