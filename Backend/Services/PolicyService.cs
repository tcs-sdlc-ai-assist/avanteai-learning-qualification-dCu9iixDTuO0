using System.Text.Json;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Backend.Services;

public class PolicyService : IPolicyService
{
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly PolicyVersionFactory _versionFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<PolicyService> _logger;

    private const string ActivePoliciesCacheKey = "active_policies";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public PolicyService(
        AppDbContext context,
        IAuditLogService auditLogService,
        PolicyVersionFactory versionFactory,
        IMemoryCache cache,
        ILogger<PolicyService> logger)
    {
        _context = context;
        _auditLogService = auditLogService;
        _versionFactory = versionFactory;
        _cache = cache;
        _logger = logger;
    }

    public async Task<List<PolicyResponseDto>> GetPoliciesAsync()
    {
        var policies = await _context.Policies
            .AsNoTracking()
            .Include(p => p.Program)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return policies.Select(MapToResponseDto).ToList();
    }

    public async Task<PolicyResponseDto?> GetPolicyByIdAsync(Guid id)
    {
        var policy = await _context.Policies
            .AsNoTracking()
            .Include(p => p.Program)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (policy is null)
        {
            return null;
        }

        return MapToResponseDto(policy);
    }

    public async Task<PolicyResponseDto> CreatePolicyAsync(CreatePolicyDto dto, Guid userId)
    {
        var program = await _context.Programs.FindAsync(dto.ProgramId);
        if (program is null)
        {
            throw new KeyNotFoundException($"Program with ID '{dto.ProgramId}' not found.");
        }

        var duplicateExists = await _context.Policies
            .AnyAsync(p => p.ProgramId == dto.ProgramId && p.Name == dto.Name);

        if (duplicateExists)
        {
            throw new InvalidOperationException($"A policy with the name '{dto.Name}' already exists in this program.");
        }

        var policy = new Policy
        {
            Id = Guid.NewGuid(),
            ProgramId = dto.ProgramId,
            Name = dto.Name,
            MinimumScore = dto.MinimumScore,
            RetakeAllowed = dto.RetakeAllowed,
            MaxRetakes = dto.MaxRetakes,
            ExemptionAllowed = dto.ExemptionAllowed,
            Status = PolicyStatus.Draft,
            CurrentVersion = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            RowVersion = Array.Empty<byte>()
        };

        var initialVersion = _versionFactory.CreateInitialVersion(policy, userId);

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            _context.Policies.Add(policy);
            _context.PolicyVersions.Add(initialVersion);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Failed to create policy '{PolicyName}' for program '{ProgramId}'", dto.Name, dto.ProgramId);
            throw new InvalidOperationException("Failed to create policy. A policy with this name may already exist in the program.", ex);
        }

        InvalidateCache();

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        var userEmail = user?.Email ?? "unknown";

        await _auditLogService.LogActionAsync(
            userId,
            userEmail,
            "Create",
            "Policy",
            policy.Id,
            new { policy.Name, policy.ProgramId, policy.MinimumScore, policy.RetakeAllowed, policy.MaxRetakes, policy.ExemptionAllowed });

        _logger.LogInformation("Policy '{PolicyName}' (ID: {PolicyId}) created by user {UserId}", policy.Name, policy.Id, userId);

        var created = await _context.Policies
            .AsNoTracking()
            .Include(p => p.Program)
            .FirstAsync(p => p.Id == policy.Id);

        return MapToResponseDto(created);
    }

    public async Task<PolicyResponseDto> UpdatePolicyAsync(Guid id, UpdatePolicyDto dto, Guid userId)
    {
        var policy = await _context.Policies
            .Include(p => p.Program)
            .Include(p => p.PolicyVersions)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (policy is null)
        {
            throw new KeyNotFoundException($"Policy with ID '{id}' not found.");
        }

        if (dto.Name is not null && dto.Name != policy.Name)
        {
            var duplicateExists = await _context.Policies
                .AnyAsync(p => p.ProgramId == policy.ProgramId && p.Name == dto.Name && p.Id != id);

            if (duplicateExists)
            {
                throw new InvalidOperationException($"A policy with the name '{dto.Name}' already exists in this program.");
            }
        }

        var previousVersion = policy.PolicyVersions
            .OrderByDescending(v => v.VersionNumber)
            .FirstOrDefault();

        if (dto.Name is not null)
            policy.Name = dto.Name;

        if (dto.MinimumScore.HasValue)
            policy.MinimumScore = dto.MinimumScore.Value;

        if (dto.RetakeAllowed.HasValue)
            policy.RetakeAllowed = dto.RetakeAllowed.Value;

        if (dto.MaxRetakes.HasValue)
            policy.MaxRetakes = dto.MaxRetakes.Value;

        if (dto.ExemptionAllowed.HasValue)
            policy.ExemptionAllowed = dto.ExemptionAllowed.Value;

        if (dto.Status is not null && Enum.TryParse<PolicyStatus>(dto.Status, true, out var newStatus))
            policy.Status = newStatus;

        policy.UpdatedAt = DateTime.UtcNow;

        var newVersion = _versionFactory.CreateVersion(policy, previousVersion, userId);
        policy.CurrentVersion = newVersion.VersionNumber;

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            _context.PolicyVersions.Add(newVersion);
            _context.Policies.Update(policy);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateConcurrencyException ex)
        {
            await transaction.RollbackAsync();
            _logger.LogWarning(ex, "Concurrency conflict updating policy '{PolicyId}'", id);
            throw new InvalidOperationException("The policy was modified by another user. Please refresh and try again.", ex);
        }
        catch (DbUpdateException ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Failed to update policy '{PolicyId}'", id);
            throw new InvalidOperationException("Failed to update policy.", ex);
        }

        InvalidateCache();

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        var userEmail = user?.Email ?? "unknown";

        await _auditLogService.LogActionAsync(
            userId,
            userEmail,
            "Update",
            "Policy",
            policy.Id,
            new { policy.Name, policy.MinimumScore, policy.RetakeAllowed, policy.MaxRetakes, policy.ExemptionAllowed, Status = policy.Status.ToString(), Version = newVersion.VersionNumber });

        _logger.LogInformation("Policy '{PolicyName}' (ID: {PolicyId}) updated to version {Version} by user {UserId}", policy.Name, policy.Id, newVersion.VersionNumber, userId);

        var updated = await _context.Policies
            .AsNoTracking()
            .Include(p => p.Program)
            .FirstAsync(p => p.Id == policy.Id);

        return MapToResponseDto(updated);
    }

    public async Task DeletePolicyAsync(Guid id)
    {
        var policy = await _context.Policies.FindAsync(id);

        if (policy is null)
        {
            throw new KeyNotFoundException($"Policy with ID '{id}' not found.");
        }

        _context.Policies.Remove(policy);
        await _context.SaveChangesAsync();

        InvalidateCache();

        _logger.LogInformation("Policy '{PolicyName}' (ID: {PolicyId}) deleted", policy.Name, policy.Id);
    }

    public async Task<List<PolicyVersionResponseDto>> GetVersionsAsync(Guid policyId)
    {
        var policyExists = await _context.Policies.AnyAsync(p => p.Id == policyId);
        if (!policyExists)
        {
            throw new KeyNotFoundException($"Policy with ID '{policyId}' not found.");
        }

        var versions = await _context.PolicyVersions
            .AsNoTracking()
            .Where(v => v.PolicyId == policyId)
            .OrderByDescending(v => v.VersionNumber)
            .ToListAsync();

        return versions.Select(MapVersionToResponseDto).ToList();
    }

    public async Task<List<PolicyResponseDto>> GetActivePoliciesAsync()
    {
        if (_cache.TryGetValue(ActivePoliciesCacheKey, out List<PolicyResponseDto>? cached) && cached is not null)
        {
            return cached;
        }

        var activePolicies = await _context.Policies
            .AsNoTracking()
            .Include(p => p.Program)
            .Where(p => p.Status == PolicyStatus.Active)
            .OrderBy(p => p.Name)
            .ToListAsync();

        var result = activePolicies.Select(MapToResponseDto).ToList();

        var cacheOptions = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(CacheDuration)
            .SetSlidingExpiration(TimeSpan.FromMinutes(2));

        _cache.Set(ActivePoliciesCacheKey, result, cacheOptions);

        _logger.LogDebug("Active policies cache populated with {Count} policies", result.Count);

        return result;
    }

    private void InvalidateCache()
    {
        _cache.Remove(ActivePoliciesCacheKey);
        _logger.LogDebug("Active policies cache invalidated");
    }

    private static PolicyResponseDto MapToResponseDto(Policy policy)
    {
        return new PolicyResponseDto
        {
            Id = policy.Id,
            ProgramId = policy.ProgramId,
            ProgramName = policy.Program?.Name ?? string.Empty,
            Name = policy.Name,
            MinimumScore = policy.MinimumScore,
            RetakeAllowed = policy.RetakeAllowed,
            MaxRetakes = policy.MaxRetakes,
            ExemptionAllowed = policy.ExemptionAllowed,
            Exemptions = new List<string>(),
            Status = policy.Status.ToString(),
            CurrentVersion = policy.CurrentVersion,
            CreatedAt = policy.CreatedAt,
            UpdatedAt = policy.UpdatedAt
        };
    }

    private static PolicyVersionResponseDto MapVersionToResponseDto(PolicyVersion version)
    {
        var dto = new PolicyVersionResponseDto
        {
            Id = version.Id,
            VersionNumber = version.VersionNumber,
            Changes = string.Empty,
            ChangedBy = version.CreatedBy.ToString(),
            ChangedAt = version.CreatedAt,
            MinimumScore = 0,
            RetakeAllowed = false,
            MaxRetakes = 0,
            ExemptionAllowed = false,
            Exemptions = new List<string>(),
            Status = string.Empty
        };

        if (!string.IsNullOrWhiteSpace(version.Rules))
        {
            try
            {
                using var doc = JsonDocument.Parse(version.Rules);
                var root = doc.RootElement;

                if (root.TryGetProperty("minimumScore", out var minScore))
                    dto.MinimumScore = minScore.GetInt32();

                if (root.TryGetProperty("retakeAllowed", out var retake))
                    dto.RetakeAllowed = retake.GetBoolean();

                if (root.TryGetProperty("maxRetakes", out var maxRetakes))
                    dto.MaxRetakes = maxRetakes.GetInt32();

                if (root.TryGetProperty("exemptionAllowed", out var exemption))
                    dto.ExemptionAllowed = exemption.GetBoolean();

                if (root.TryGetProperty("status", out var status))
                    dto.Status = status.GetString() ?? string.Empty;

                if (root.TryGetProperty("exemptions", out var exemptions) && exemptions.ValueKind == JsonValueKind.Array)
                {
                    dto.Exemptions = exemptions.EnumerateArray()
                        .Select(e => e.GetString() ?? string.Empty)
                        .Where(s => !string.IsNullOrEmpty(s))
                        .ToList();
                }
            }
            catch (JsonException ex)
            {
                // If rules JSON is malformed, leave defaults
                _ = ex;
            }
        }

        dto.Changes = version.Rules;

        return dto;
    }
}