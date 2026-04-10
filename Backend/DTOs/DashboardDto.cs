namespace Backend.DTOs;

public class DashboardSummaryDto
{
    public int TotalPrograms { get; set; }
    public int TotalEvidence { get; set; }
    public double ComplianceRate { get; set; }
    public int PendingExceptions { get; set; }
    public int ResolvedExceptions { get; set; }
    public int TotalAlerts { get; set; }
}

public class ExceptionTrendDto
{
    public DateTimeOffset Date { get; set; }
    public int Count { get; set; }
    public int OpenCount { get; set; }
    public int ResolvedCount { get; set; }
    public int EscalatedCount { get; set; }
}

public class SlaMetricsDto
{
    public double OnTimePercentage { get; set; }
    public double BreachedPercentage { get; set; }
    public double PendingPercentage { get; set; }
    public int TotalItems { get; set; }
    public int OnTimeCount { get; set; }
    public int BreachedCount { get; set; }
    public int PendingCount { get; set; }
}

public class OverdueTrainingDto
{
    public string EmployeeName { get; set; } = string.Empty;
    public string CourseName { get; set; } = string.Empty;
    public DateTimeOffset DueDate { get; set; }
    public int DaysOverdue { get; set; }
}