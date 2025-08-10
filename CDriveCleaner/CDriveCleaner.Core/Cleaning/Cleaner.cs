using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using CDriveCleaner.Core.Models;
using CDriveCleaner.Core.Interop;
using CDriveCleaner.Core.Utilities;

namespace CDriveCleaner.Core.Cleaning;

public class Cleaner
{
    public async Task CleanAsync(IEnumerable<ScanItem> items, IProgress<string>? progress, CancellationToken cancellationToken)
    {
        var toClean = items.ToList();
        foreach (var item in toClean)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                progress?.Report($"Cleaning: {item.Name}");

                if (item.Category == "Recycle Bin")
                {
                    NativeMethods.EmptyRecycleBin();
                    continue;
                }

                if (Directory.Exists(item.Path))
                {
                    await Task.Run(() => FileSystemHelper.TryDeleteDirectoryContents(item.Path), cancellationToken);
                }
                else if (File.Exists(item.Path))
                {
                    await Task.Run(() => FileSystemHelper.TryDeleteFile(item.Path), cancellationToken);
                }
            }
            catch
            {
                // Ignore per-item errors to continue cleaning
            }
        }
    }
}