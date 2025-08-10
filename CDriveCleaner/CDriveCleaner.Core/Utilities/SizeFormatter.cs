namespace CDriveCleaner.Core.Utilities;

public static class SizeFormatter
{
    private static readonly string[] Units = { "B", "KB", "MB", "GB", "TB" };

    public static string FormatBytes(long bytes)
    {
        if (bytes < 0) bytes = 0;
        double size = bytes;
        int unitIndex = 0;
        while (size >= 1024 && unitIndex < Units.Length - 1)
        {
            size /= 1024;
            unitIndex++;
        }
        return unitIndex == 0 ? $"{bytes} {Units[unitIndex]}" : $"{size:0.##} {Units[unitIndex]}";
    }
}