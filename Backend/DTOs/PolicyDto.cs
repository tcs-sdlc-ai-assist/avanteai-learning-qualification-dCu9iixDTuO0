using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class CreatePolicyDto
{
    [Required]
    public Guid ProgramId { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public required string Name { get; set; }

    [Required]
    [Range(0, 100, ErrorMessage = "Minimum score must be between 0 and 100.")]
    public int MinimumScore { get; set; }

    [Required]
    public bool RetakeAllowed { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "Max retakes must be 0 or greater.")]
    public int MaxRetakes { get; set; }

    [Required]
    public bool ExemptionAllowed { get; set; }

    public IList<string>? Exemptions { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (RetakeAllowed && MaxRetakes <= 0)
        {
            yield return new ValidationResult(
                "MaxRetakes must be greater than 0 when RetakeAllowed is true.",
                new[] { nameof(MaxRetakes) });
        }
    }
}

public class UpdatePolicyDto : IValidatableObject
{
    [StringLength(100, MinimumLength = 1)]
    public string? Name { get; set; }

    [Range(0, 100, ErrorMessage = "Minimum score must be between 0 and 100.")]
    public int? MinimumScore { get; set; }

    public bool? RetakeAllowed { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "Max retakes must be 0 or greater.")]
    public int? MaxRetakes { get; set; }

    public bool? ExemptionAllowed { get; set; }

    public IList<string>? Exemptions { get; set; }

    [RegularExpression("^(Draft|Active|Retired)$", ErrorMessage = "Status must be Draft, Active, or Retired.")]
    public string? Status { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (RetakeAllowed == true && MaxRetakes is not null && MaxRetakes <= 0)
        {
            yield return new ValidationResult(
                "MaxRetakes must be greater than 0 when RetakeAllowed is true.",
                new[] { nameof(MaxRetakes) });
        }
    }
}

public class PolicyResponseDto
{
    public Guid Id { get; set; }
    public Guid ProgramId { get; set; }
    public string ProgramName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int MinimumScore { get; set; }
    public bool RetakeAllowed { get; set; }
    public int MaxRetakes { get; set; }
    public bool ExemptionAllowed { get; set; }
    public IList<string> Exemptions { get; set; } = new List<string>();
    public string Status { get; set; } = string.Empty;
    public int CurrentVersion { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class PolicyVersionResponseDto
{
    public Guid Id { get; set; }
    public int VersionNumber { get; set; }
    public string Changes { get; set; } = string.Empty;
    public string ChangedBy { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; }
    public int MinimumScore { get; set; }
    public bool RetakeAllowed { get; set; }
    public int MaxRetakes { get; set; }
    public bool ExemptionAllowed { get; set; }
    public IList<string> Exemptions { get; set; } = new List<string>();
    public string Status { get; set; } = string.Empty;
}