using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<ComplianceProgram> Programs { get; set; } = null!;
    public DbSet<Policy> Policies { get; set; } = null!;
    public DbSet<PolicyVersion> PolicyVersions { get; set; } = null!;
    public DbSet<Evidence> Evidence { get; set; } = null!;
    public DbSet<ComplianceException> Exceptions { get; set; } = null!;
    public DbSet<Alert> Alerts { get; set; } = null!;
    public DbSet<AuditLog> AuditLogs { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── User ──────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");

            entity.HasKey(u => u.Id);

            entity.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(256);

            entity.Property(u => u.PasswordHash)
                .IsRequired()
                .HasMaxLength(512);

            entity.Property(u => u.FullName)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(u => u.Role)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(32);

            entity.Property(u => u.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW()");

            entity.Property(u => u.IsActive)
                .IsRequired()
                .HasDefaultValue(true);

            entity.HasIndex(u => u.Email)
                .IsUnique();
        });

        // ── ComplianceProgram ─────────────────────────────────────────────
        modelBuilder.Entity<ComplianceProgram>(entity =>
        {
            entity.ToTable("Programs");

            entity.HasKey(p => p.Id);

            entity.Property(p => p.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(p => p.Description)
                .HasColumnType("text");

            entity.Property(p => p.Status)
                .IsRequired()
                .HasMaxLength(20);

            entity.Property(p => p.CreatedBy)
                .IsRequired();

            entity.Property(p => p.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW()");

            entity.Property(p => p.UpdatedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW()");

            entity.Property(p => p.RowVersion)
                .IsRowVersion();

            entity.HasIndex(p => p.Name);

            entity.HasIndex(p => p.Status);

            entity.HasMany(p => p.Policies)
                .WithOne(pol => pol.Program)
                .HasForeignKey(pol => pol.ProgramId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Policy ────────────────────────────────────────────────────────
        modelBuilder.Entity<Policy>(entity =>
        {
            entity.ToTable("Policies");

            entity.HasKey(p => p.Id);

            entity.Property(p => p.ProgramId)
                .IsRequired();

            entity.Property(p => p.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(p => p.MinimumScore)
                .IsRequired();

            entity.Property(p => p.RetakeAllowed)
                .IsRequired();

            entity.Property(p => p.MaxRetakes)
                .IsRequired()
                .HasDefaultValue(0);

            entity.Property(p => p.ExemptionAllowed)
                .IsRequired();

            entity.Property(p => p.Status)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(p => p.CurrentVersion)
                .IsRequired()
                .HasDefaultValue(1);

            entity.Property(p => p.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW()");

            entity.Property(p => p.UpdatedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW()");

            entity.Property(p => p.RowVersion)
                .IsConcurrencyToken();

            entity.HasIndex(p => p.ProgramId);

            entity.HasIndex(p => new { p.ProgramId, p.Name })
                .IsUnique();

            entity.HasMany(p => p.PolicyVersions)
                .WithOne(pv => pv.Policy)
                .HasForeignKey(pv => pv.PolicyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── PolicyVersion ─────────────────────────────────────────────────
        modelBuilder.Entity<PolicyVersion>(entity =>
        {
            entity.ToTable("PolicyVersions");

            entity.HasKey(pv => pv.Id);

            entity.Property(pv => pv.PolicyId)
                .IsRequired();

            entity.Property(pv => pv.VersionNumber)
                .IsRequired();

            entity.Property(pv => pv.Rules)
                .IsRequired()
                .HasColumnType("jsonb");

            entity.Property(pv => pv.CreatedBy)
                .IsRequired();

            entity.Property(pv => pv.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW()");

            entity.HasIndex(pv => new { pv.PolicyId, pv.VersionNumber })
                .IsUnique();
        });

        // ── Evidence ──────────────────────────────────────────────────────
        modelBuilder.Entity<Evidence>(entity =>
        {
            entity.ToTable("Evidence");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.EmployeeId)
                .IsRequired()
                .HasMaxLength(32);

            entity.Property(e => e.EmployeeName)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(e => e.CourseName)
                .IsRequired()
                .HasMaxLength(300);

            entity.Property(e => e.CompletionDate)
                .IsRequired();

            entity.Property(e => e.Score)
                .IsRequired();

            entity.Property(e => e.ConfidenceLevel)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(16);

            entity.Property(e => e.Status)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(16);

            entity.Property(e => e.UploadedBy)
                .IsRequired();

            entity.Property(e => e.UploadedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW()");

            entity.HasIndex(e => e.EmployeeId);

            entity.HasIndex(e => e.PolicyId);

            entity.HasIndex(e => e.Status);

            entity.HasIndex(e => e.UploadedBy);

            entity.HasIndex(e => new { e.EmployeeId, e.CourseName, e.CompletionDate });
        });

        // ── ComplianceException ───────────────────────────────────────────
        modelBuilder.Entity<ComplianceException>(entity =>
        {
            entity.ToTable("Exceptions");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.EvidenceId)
                .IsRequired();

            entity.Property(e => e.Reason)
                .IsRequired()
                .HasMaxLength(2000);

            entity.Property(e => e.Status)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(e => e.Justification)
                .HasMaxLength(2000);

            entity.Property(e => e.SlaDeadline)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW()");

            entity.HasIndex(e => e.EvidenceId);

            entity.HasIndex(e => e.Status);

            entity.HasIndex(e => e.SlaDeadline);

            entity.HasIndex(e => e.ReviewedBy);

            entity.HasOne(e => e.Evidence)
                .WithMany()
                .HasForeignKey(e => e.EvidenceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Alert ─────────────────────────────────────────────────────────
        modelBuilder.Entity<Alert>(entity =>
        {
            entity.ToTable("Alerts");

            entity.HasKey(a => a.Id);

            entity.Property(a => a.UserId)
                .IsRequired();

            entity.Property(a => a.Type)
                .IsRequired()
                .HasMaxLength(32);

            entity.Property(a => a.Message)
                .IsRequired();

            entity.Property(a => a.IsRead)
                .IsRequired()
                .HasDefaultValue(false);

            entity.Property(a => a.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW()");

            entity.Property(a => a.RelatedEntityType)
                .HasMaxLength(64);

            entity.HasIndex(a => a.UserId);

            entity.HasIndex(a => new { a.UserId, a.IsRead });

            entity.HasIndex(a => a.CreatedAt);

            entity.HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── AuditLog ─────────────────────────────────────────────────────
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("AuditLogs");

            entity.HasKey(a => a.Id);

            entity.Property(a => a.UserId)
                .IsRequired();

            entity.Property(a => a.UserEmail)
                .IsRequired()
                .HasMaxLength(256);

            entity.Property(a => a.Action)
                .IsRequired()
                .HasMaxLength(64);

            entity.Property(a => a.Entity)
                .IsRequired()
                .HasMaxLength(64);

            entity.Property(a => a.Details)
                .HasColumnType("jsonb");

            entity.Property(a => a.Timestamp)
                .IsRequired()
                .HasDefaultValueSql("NOW()");

            entity.HasIndex(a => a.UserId);

            entity.HasIndex(a => a.Action);

            entity.HasIndex(a => a.Entity);

            entity.HasIndex(a => a.Timestamp);

            entity.HasIndex(a => new { a.Entity, a.EntityId });
        });

        // ── Seed Data ─────────────────────────────────────────────────────
        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        var adminId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var createdAt = new DateTime(2025, 1, 15, 0, 0, 0, DateTimeKind.Utc);

        // Seed admin user (password: Admin123!)
        // BCrypt hash of "Admin123!" — pre-computed for seed data
        modelBuilder.Entity<User>().HasData(new User
        {
            Id = adminId,
            Email = "admin@avante.com",
            PasswordHash = "AQAAAAIAAYagAAAAELbwMOr1u0n1MkfKHOEfOxVoM3cNzKLhqPSvGU5fQ7Y9hR2eGqaaMP1W5eOjqFcuQ==",
            FullName = "System Administrator",
            Role = UserRole.Admin,
            CreatedAt = createdAt,
            IsActive = true
        });

        // Seed default compliance programs
        var programId1 = Guid.Parse("00000000-0000-0000-0000-000000000010");
        var programId2 = Guid.Parse("00000000-0000-0000-0000-000000000011");

        modelBuilder.Entity<ComplianceProgram>().HasData(
            new ComplianceProgram
            {
                Id = programId1,
                Name = "Annual Compliance Training",
                Description = "Mandatory annual compliance training program for all employees covering regulatory requirements, company policies, and ethical standards.",
                Status = "Active",
                CreatedBy = adminId,
                CreatedAt = createdAt,
                UpdatedAt = createdAt
            },
            new ComplianceProgram
            {
                Id = programId2,
                Name = "Anti-Money Laundering (AML)",
                Description = "Anti-money laundering training program covering identification, reporting, and prevention of money laundering activities.",
                Status = "Active",
                CreatedBy = adminId,
                CreatedAt = createdAt,
                UpdatedAt = createdAt
            }
        );

        // Seed default policies
        var policyId1 = Guid.Parse("00000000-0000-0000-0000-000000000020");
        var policyId2 = Guid.Parse("00000000-0000-0000-0000-000000000021");

        modelBuilder.Entity<Policy>().HasData(
            new Policy
            {
                Id = policyId1,
                ProgramId = programId1,
                Name = "Annual Compliance Assessment Policy",
                MinimumScore = 80,
                RetakeAllowed = true,
                MaxRetakes = 3,
                ExemptionAllowed = true,
                Status = PolicyStatus.Active,
                CurrentVersion = 1,
                CreatedAt = createdAt,
                UpdatedAt = createdAt,
                RowVersion = Array.Empty<byte>()
            },
            new Policy
            {
                Id = policyId2,
                ProgramId = programId2,
                Name = "AML Certification Policy",
                MinimumScore = 85,
                RetakeAllowed = true,
                MaxRetakes = 2,
                ExemptionAllowed = false,
                Status = PolicyStatus.Active,
                CurrentVersion = 1,
                CreatedAt = createdAt,
                UpdatedAt = createdAt,
                RowVersion = Array.Empty<byte>()
            }
        );

        // Seed initial policy versions
        modelBuilder.Entity<PolicyVersion>().HasData(
            new PolicyVersion
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000030"),
                PolicyId = policyId1,
                VersionNumber = 1,
                Rules = "{\"minimumScore\":80,\"retakeAllowed\":true,\"maxRetakes\":3,\"exemptionAllowed\":true}",
                CreatedBy = adminId,
                CreatedAt = createdAt
            },
            new PolicyVersion
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000031"),
                PolicyId = policyId2,
                VersionNumber = 1,
                Rules = "{\"minimumScore\":85,\"retakeAllowed\":true,\"maxRetakes\":2,\"exemptionAllowed\":false}",
                CreatedBy = adminId,
                CreatedAt = createdAt
            }
        );
    }
}