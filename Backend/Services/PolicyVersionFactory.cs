using System.Text.Json;
using Backend.Models;

namespace Backend.Services;

public class PolicyVersionFactory
{
    /// <summary>
    /// Creates a new PolicyVersion entity representing the current state of a policy.
    /// Compares old and new policy states to generate a change summary.
    /// </summary>
    /// <param name="policy">The policy entity (with updated values already applied).</param>
    /// <param name="previousVersion">The previous PolicyVersion, or null if this is the first version.</param>
    /// <param name="createdBy">The user ID who made the change.</param>
    /// <returns>A new PolicyVersion entity ready to be persisted.</returns>
    public PolicyVersion CreateVersion(Policy policy, PolicyVersion? previousVersion, Guid createdBy)
    {
        var newVersionNumber = previousVersion is not null
            ? previousVersion.VersionNumber + 1
            : 1;

        var rules = SerializeRules(policy);
        var changes = previousVersion is not null
            ? ComputeChanges(previousVersion.Rules, rules)
            : BuildInitialChanges();

        return new PolicyVersion
        {
            Id = Guid.NewGuid(),
            PolicyId = policy.Id,
            VersionNumber = newVersionNumber,
            Rules = rules,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Creates the initial PolicyVersion for a newly created policy.
    /// </summary>
    /// <param name="policy">The newly created policy entity.</param>
    /// <param name="createdBy">The user ID who created the policy.</param>
    /// <returns>A new PolicyVersion entity with version number 1.</returns>
    public PolicyVersion CreateInitialVersion(Policy policy, Guid createdBy)
    {
        return CreateVersion(policy, null, createdBy);
    }

    /// <summary>
    /// Serializes the current policy rules to a JSON string for storage.
    /// </summary>
    /// <param name="policy">The policy entity to serialize.</param>
    /// <returns>A JSON string representing the policy rules.</returns>
    private static string SerializeRules(Policy policy)
    {
        var rulesObject = new PolicyRulesSnapshot
        {
            MinimumScore = policy.MinimumScore,
            RetakeAllowed = policy.RetakeAllowed,
            MaxRetakes = policy.MaxRetakes,
            ExemptionAllowed = policy.ExemptionAllowed,
            Status = policy.Status.ToString()
        };

        return JsonSerializer.Serialize(rulesObject, JsonSerializerOptions);
    }

    /// <summary>
    /// Computes a JSON string describing the differences between two rule snapshots.
    /// </summary>
    /// <param name="previousRulesJson">The previous version's rules JSON.</param>
    /// <param name="currentRulesJson">The current version's rules JSON.</param>
    /// <returns>A JSON string describing the changes.</returns>
    private static string ComputeChanges(string previousRulesJson, string currentRulesJson)
    {
        PolicyRulesSnapshot? previous = null;
        PolicyRulesSnapshot? current = null;

        try
        {
            previous = JsonSerializer.Deserialize<PolicyRulesSnapshot>(previousRulesJson, JsonSerializerOptions);
        }
        catch (JsonException)
        {
            // If previous rules can't be deserialized, treat all fields as changed
        }

        try
        {
            current = JsonSerializer.Deserialize<PolicyRulesSnapshot>(currentRulesJson, JsonSerializerOptions);
        }
        catch (JsonException)
        {
            // If current rules can't be deserialized, return empty changes
            return "{}";
        }

        if (previous is null || current is null)
        {
            return BuildInitialChanges();
        }

        var changes = new List<ChangeEntry>();

        if (previous.MinimumScore != current.MinimumScore)
        {
            changes.Add(new ChangeEntry
            {
                Field = "MinimumScore",
                OldValue = previous.MinimumScore.ToString(),
                NewValue = current.MinimumScore.ToString()
            });
        }

        if (previous.RetakeAllowed != current.RetakeAllowed)
        {
            changes.Add(new ChangeEntry
            {
                Field = "RetakeAllowed",
                OldValue = previous.RetakeAllowed.ToString(),
                NewValue = current.RetakeAllowed.ToString()
            });
        }

        if (previous.MaxRetakes != current.MaxRetakes)
        {
            changes.Add(new ChangeEntry
            {
                Field = "MaxRetakes",
                OldValue = previous.MaxRetakes.ToString(),
                NewValue = current.MaxRetakes.ToString()
            });
        }

        if (previous.ExemptionAllowed != current.ExemptionAllowed)
        {
            changes.Add(new ChangeEntry
            {
                Field = "ExemptionAllowed",
                OldValue = previous.ExemptionAllowed.ToString(),
                NewValue = current.ExemptionAllowed.ToString()
            });
        }

        if (previous.Status != current.Status)
        {
            changes.Add(new ChangeEntry
            {
                Field = "Status",
                OldValue = previous.Status ?? string.Empty,
                NewValue = current.Status ?? string.Empty
            });
        }

        if (changes.Count == 0)
        {
            return JsonSerializer.Serialize(new { message = "No changes detected" }, JsonSerializerOptions);
        }

        return JsonSerializer.Serialize(changes, JsonSerializerOptions);
    }

    /// <summary>
    /// Builds a change summary for the initial version of a policy.
    /// </summary>
    /// <returns>A JSON string indicating initial creation.</returns>
    private static string BuildInitialChanges()
    {
        return JsonSerializer.Serialize(new { message = "Initial version" }, JsonSerializerOptions);
    }

    private static readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    /// <summary>
    /// Internal snapshot of policy rules for serialization and comparison.
    /// </summary>
    private sealed class PolicyRulesSnapshot
    {
        public int MinimumScore { get; set; }
        public bool RetakeAllowed { get; set; }
        public int MaxRetakes { get; set; }
        public bool ExemptionAllowed { get; set; }
        public string? Status { get; set; }
    }

    /// <summary>
    /// Represents a single field change between two policy versions.
    /// </summary>
    private sealed class ChangeEntry
    {
        public string Field { get; set; } = string.Empty;
        public string OldValue { get; set; } = string.Empty;
        public string NewValue { get; set; } = string.Empty;
    }
}