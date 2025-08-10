using System;
using System.IO;

namespace CDriveCleaner.Core.Utilities;

public static class FileSystemHelper
{
    public static long TryComputeSize(string path, System.Threading.CancellationToken cancellationToken)
    {
        try
        {
            if (File.Exists(path))
            {
                return new FileInfo(path).Length;
            }
            if (Directory.Exists(path))
            {
                return ComputeDirectorySize(path, cancellationToken);
            }
        }
        catch { }
        return 0;
    }

    public static long ComputeDirectorySize(string directoryPath, System.Threading.CancellationToken cancellationToken)
    {
        long size = 0;
        try
        {
            foreach (var filePath in Directory.EnumerateFiles(directoryPath, "*", SearchOption.AllDirectories))
            {
                cancellationToken.ThrowIfCancellationRequested();
                try
                {
                    size += new FileInfo(filePath).Length;
                }
                catch { }
            }
        }
        catch { }
        return size;
    }

    public static void TryDeleteDirectoryContents(string directoryPath)
    {
        try
        {
            if (!Directory.Exists(directoryPath)) return;

            foreach (var dir in Directory.EnumerateDirectories(directoryPath))
            {
                TryDeleteDirectory(dir);
            }
            foreach (var file in Directory.EnumerateFiles(directoryPath))
            {
                TryDeleteFile(file);
            }
        }
        catch { }
    }

    public static void TryDeleteDirectory(string directoryPath)
    {
        try
        {
            if (!Directory.Exists(directoryPath)) return;
            Directory.Delete(directoryPath, true);
        }
        catch { }
    }

    public static void TryDeleteFile(string filePath)
    {
        try
        {
            if (File.Exists(filePath)) File.Delete(filePath);
        }
        catch { }
    }
}