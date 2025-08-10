namespace CDriveCleaner.Core.Models;

public class ScanItem
{
    public string Category { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Path { get; init; } = string.Empty;
    public long SizeBytes { get; set; }
    public bool Selected { get; set; }

    public string SizeDisplay => Utilities.SizeFormatter.FormatBytes(SizeBytes);
}