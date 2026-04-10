using Backend.Data;
using Backend.Models;

namespace Backend.Services;

public enum ValidationConfidence
{
    High,
    Medium,
    Low
}

public class ValidationOutcome
{
    public Guid EvidenceId { get; set; }
    public ValidationConfidence Confidence { get; set; }
    public bool ExceptionFlagged { get; set; }
    public string? Reason { get; set; }
    public int Score { get; set; }
    public int PolicyMinimumScore { get; set; }
}

public interface ISimulatedAIValidator
{
    /// <summary>
    /// Validates a single evidence record against the matching active policy.
    /// Returns a ValidationOutcome with confidence level and exception flag.
    /// </summary>
    Task<ValidationOutcome> ValidateAsync(Evidence evidence);

    /// <summary>
    /// Validates a batch of evidence records against their matching active policies.
    /// Returns a list of ValidationOutcome results.
    /// </summary>
    Task<List<ValidationOutcome>> ValidateBatchAsync(IEnumerable<Evidence> evidenceRecords);
}

public class SimulatedAIValidator : ISimulatedAIValidator
{
    private readonly IPolicyService _policyService;
    private readonly ILogger<SimulatedAIValidator> _logger;

    public SimulatedAIValidator(IPolicyService policyService, ILogger<SimulatedAIValidator> logger)
    {
        _policyService = policyService;
        _logger = logger;
    }

    public async Task<ValidationOutcome> ValidateAsync(Evidence evidence)
    {
        var results = await ValidateBatchAsync(new[] { evidence });
        return results.First();
    }

    public async Task<List<ValidationOutcome>> ValidateBatchAsync(IEnumerable<Evidence> evidenceRecords)
    {
        var activePolicies = await _policyService.GetActivePoliciesAsync();
        var outcomes = new List<ValidationOutcome>();

        foreach (var evidence in evidenceRecords)
        {
            var outcome = EvaluateEvidence(evidence, activePolicies);
            outcomes.Add(outcome);

            _logger.LogInformation(
                "Validated evidence {EvidenceId} for employee {EmployeeId}: Confidence={Confidence}, ExceptionFlagged={ExceptionFlagged}, Score={Score}",
                evidence.Id, evidence.EmployeeId, outcome.Confidence, outcome.ExceptionFlagged, evidence.Score);
        }

        return outcomes;
    }

    private ValidationOutcome EvaluateEvidence(Evidence evidence, List<DTOs.PolicyResponseDto> activePolicies)
    {
        // Find the matching policy for this evidence record
        DTOs.PolicyResponseDto? matchingPolicy = null;

        if (evidence.PolicyId.HasValue)
        {
            matchingPolicy = activePolicies.FirstOrDefault(p => p.Id == evidence.PolicyId.Value);
        }

        // If no specific policy match, try to find any active policy
        if (matchingPolicy is null && activePolicies.Count > 0)
        {
            matchingPolicy = activePolicies.First();
        }

        // If no active policy exists, default to a baseline validation
        if (matchingPolicy is null)
        {
            return EvaluateWithoutPolicy(evidence);
        }

        return EvaluateWithPolicy(evidence, matchingPolicy);
    }

    private static ValidationOutcome EvaluateWithPolicy(Evidence evidence, DTOs.PolicyResponseDto policy)
    {
        var outcome = new ValidationOutcome
        {
            EvidenceId = evidence.Id,
            Score = evidence.Score,
            PolicyMinimumScore = policy.MinimumScore
        };

        int scoreDifference = evidence.Score - policy.MinimumScore;

        if (scoreDifference >= 10)
        {
            // Score is well above the minimum — high confidence
            outcome.Confidence = ValidationConfidence.High;
            outcome.ExceptionFlagged = false;
            outcome.Reason = null;
        }
        else if (scoreDifference >= 0)
        {
            // Score meets minimum but is close to the threshold — medium confidence
            outcome.Confidence = ValidationConfidence.Medium;
            outcome.ExceptionFlagged = false;
            outcome.Reason = $"Score {evidence.Score} meets minimum {policy.MinimumScore} but is within 10 points of the threshold.";
        }
        else if (scoreDifference >= -10)
        {
            // Score is slightly below minimum — medium confidence, flag for review
            outcome.Confidence = ValidationConfidence.Medium;
            outcome.ExceptionFlagged = true;
            outcome.Reason = $"Score {evidence.Score} is below minimum {policy.MinimumScore} by {Math.Abs(scoreDifference)} points.";

            // If retakes are allowed, reduce severity
            if (policy.RetakeAllowed && policy.MaxRetakes > 0)
            {
                outcome.Reason += $" Retake is allowed (max {policy.MaxRetakes}).";
            }
        }
        else
        {
            // Score is significantly below minimum — low confidence, flag exception
            outcome.Confidence = ValidationConfidence.Low;
            outcome.ExceptionFlagged = true;
            outcome.Reason = $"Score {evidence.Score} is significantly below minimum {policy.MinimumScore} by {Math.Abs(scoreDifference)} points.";

            if (!policy.RetakeAllowed)
            {
                outcome.Reason += " Retake is not allowed per policy.";
            }

            if (!policy.ExemptionAllowed)
            {
                outcome.Reason += " Exemption is not allowed per policy.";
            }
        }

        // Additional validation: check completion date is not in the future
        if (evidence.CompletionDate > DateTime.UtcNow)
        {
            outcome.Confidence = ValidationConfidence.Low;
            outcome.ExceptionFlagged = true;
            outcome.Reason = $"Completion date {evidence.CompletionDate:yyyy-MM-dd} is in the future.";
        }

        // Additional validation: check for zero score
        if (evidence.Score == 0)
        {
            outcome.Confidence = ValidationConfidence.Low;
            outcome.ExceptionFlagged = true;
            outcome.Reason = "Score is 0, which indicates the assessment was not completed or failed entirely.";
        }

        return outcome;
    }

    private static ValidationOutcome EvaluateWithoutPolicy(Evidence evidence)
    {
        const int defaultMinimumScore = 70;

        var outcome = new ValidationOutcome
        {
            EvidenceId = evidence.Id,
            Score = evidence.Score,
            PolicyMinimumScore = defaultMinimumScore
        };

        if (evidence.Score >= defaultMinimumScore + 10)
        {
            outcome.Confidence = ValidationConfidence.High;
            outcome.ExceptionFlagged = false;
            outcome.Reason = null;
        }
        else if (evidence.Score >= defaultMinimumScore)
        {
            outcome.Confidence = ValidationConfidence.Medium;
            outcome.ExceptionFlagged = false;
            outcome.Reason = $"Score {evidence.Score} meets default minimum {defaultMinimumScore} but no active policy found for detailed validation.";
        }
        else
        {
            outcome.Confidence = ValidationConfidence.Low;
            outcome.ExceptionFlagged = true;
            outcome.Reason = $"Score {evidence.Score} is below default minimum {defaultMinimumScore}. No active policy found for this evidence record.";
        }

        // Check completion date
        if (evidence.CompletionDate > DateTime.UtcNow)
        {
            outcome.Confidence = ValidationConfidence.Low;
            outcome.ExceptionFlagged = true;
            outcome.Reason = $"Completion date {evidence.CompletionDate:yyyy-MM-dd} is in the future.";
        }

        // Check for zero score
        if (evidence.Score == 0)
        {
            outcome.Confidence = ValidationConfidence.Low;
            outcome.ExceptionFlagged = true;
            outcome.Reason = "Score is 0, which indicates the assessment was not completed or failed entirely.";
        }

        return outcome;
    }
}