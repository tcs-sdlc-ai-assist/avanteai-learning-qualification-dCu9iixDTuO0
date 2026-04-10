using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class ExportRequestDto
{
    [Required]
    [StringLength(64, MinimumLength = 1)]
    public required string EntityType { get; set; }

    [Required]
    [RegularExpression("^(CSV|JSON)$", ErrorMessage = "Format must be 'CSV' or 'JSON'.")]
    public required string Format { get; set; }

    public int? Page { get; set; }

    [Range(1, 10000)]
    public int? PageSize { get; set; }

    public DateTimeOffset? FromDate { get; set; }

    public DateTimeOffset? ToDate { get; set; }

    public Guid? UserId { get; set; }

    [StringLength(64)]
    public string? Action { get; set; }

    [StringLength(64)]
    public string? RelatedEntityType { get; set; }

    public Guid? RelatedEntityId { get; set; }

    public Dictionary<string, string>? AdditionalFilters { get; set; }
}

public class ExportResponseDto
{
    public required string FileName { get; set; }

    public required string ContentType { get; set; }

    public required byte[] Data { get; set; }

    public long TotalRecords { get; set; }

    public DateTimeOffset GeneratedAt { get; set; } = DateTimeOffset.UtcNow;
}