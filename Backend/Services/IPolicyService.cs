using Backend.DTOs;

namespace Backend.Services;

public interface IPolicyService
{
    Task<List<PolicyResponseDto>> GetPoliciesAsync();

    Task<PolicyResponseDto?> GetPolicyByIdAsync(Guid id);

    Task<PolicyResponseDto> CreatePolicyAsync(CreatePolicyDto dto, Guid userId);

    Task<PolicyResponseDto> UpdatePolicyAsync(Guid id, UpdatePolicyDto dto, Guid userId);

    Task DeletePolicyAsync(Guid id);

    Task<List<PolicyVersionResponseDto>> GetVersionsAsync(Guid policyId);

    Task<List<PolicyResponseDto>> GetActivePoliciesAsync();
}