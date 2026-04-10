using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class ProgramService : IProgramService
{
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<ProgramService> _logger;

    public ProgramService(
        AppDbContext context,
        IAuditLogService auditLogService,
        ILogger<ProgramService> logger)
    {
        _context = context;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    public async Task<List<ProgramResponseDto>> GetAllAsync()
    {
        var programs = await _context.Programs
            .AsNoTracking()
            .Include(p => p.Policies)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return programs.Select(MapToDto).ToList();
    }

    public async Task<ProgramResponseDto?> GetByIdAsync(Guid id)
    {
        var program = await _context.Programs
            .AsNoTracking()
            .Include(p => p.Policies)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (program is null)
        {
            return null;
        }

        return MapToDto(program);
    }

    public async Task<ProgramResponseDto> CreateAsync(CreateProgramDto dto, Guid userId)
    {
        var existingProgram = await _context.Programs
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Name == dto.Name);

        if (existingProgram is not null)
        {
            throw new InvalidOperationException($"A program with the name '{dto.Name}' already exists.");
        }

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        var program = new ComplianceProgram
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            Status = "Active",
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Programs.Add(program);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Program {ProgramId} '{ProgramName}' created by user {UserId}",
            program.Id, program.Name, userId);

        await _auditLogService.LogActionAsync(
            userId,
            user?.Email ?? "unknown",
            "Create",
            "Program",
            program.Id,
            new { program.Name, program.Description, program.Status });

        return MapToDto(program);
    }

    public async Task<ProgramResponseDto> UpdateAsync(Guid id, UpdateProgramDto dto)
    {
        var program = await _context.Programs
            .Include(p => p.Policies)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (program is null)
        {
            throw new KeyNotFoundException($"Program with ID '{id}' was not found.");
        }

        var duplicateProgram = await _context.Programs
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Name == dto.Name && p.Id != id);

        if (duplicateProgram is not null)
        {
            throw new InvalidOperationException($"A program with the name '{dto.Name}' already exists.");
        }

        var previousName = program.Name;
        var previousDescription = program.Description;
        var previousStatus = program.Status;

        program.Name = dto.Name;
        program.Description = dto.Description;
        program.StatusEnum = (Models.ProgramStatus)dto.Status;
        program.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Program {ProgramId} '{ProgramName}' updated",
            program.Id, program.Name);

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == program.CreatedBy);

        await _auditLogService.LogActionAsync(
            program.CreatedBy,
            user?.Email ?? "unknown",
            "Update",
            "Program",
            program.Id,
            new
            {
                PreviousName = previousName,
                NewName = program.Name,
                PreviousDescription = previousDescription,
                NewDescription = program.Description,
                PreviousStatus = previousStatus,
                NewStatus = program.Status
            });

        return MapToDto(program);
    }

    public async Task DeleteAsync(Guid id)
    {
        var program = await _context.Programs
            .Include(p => p.Policies)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (program is null)
        {
            throw new KeyNotFoundException($"Program with ID '{id}' was not found.");
        }

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == program.CreatedBy);

        _context.Programs.Remove(program);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Program {ProgramId} '{ProgramName}' deleted",
            program.Id, program.Name);

        await _auditLogService.LogActionAsync(
            program.CreatedBy,
            user?.Email ?? "unknown",
            "Delete",
            "Program",
            program.Id,
            new { program.Name, program.Description, program.Status });
    }

    private static ProgramResponseDto MapToDto(ComplianceProgram program)
    {
        return new ProgramResponseDto
        {
            Id = program.Id,
            Name = program.Name,
            Description = program.Description,
            Status = program.StatusEnum,
            CreatedBy = program.CreatedBy,
            CreatedAt = program.CreatedAt,
            UpdatedAt = program.UpdatedAt,
            PolicyCount = program.Policies?.Count ?? 0
        };
    }
}