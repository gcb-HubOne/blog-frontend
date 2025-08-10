using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CDriveCleaner.Core.Models;

namespace CDriveCleaner.Core.Analysis;

public class TempAnalyzer : AnalyzerBase
{
    public override string Category => "Temporary Files";

    public override Task<IReadOnlyList<ScanItem>> AnalyzeAsync(CancellationToken cancellationToken)
    {
        var items = new List<ScanItem>();
        try
        {
            var userTemp = Path.GetTempPath();
            if (!string.IsNullOrWhiteSpace(userTemp))
            {
                items.Add(CreateItem(Category, "%TEMP%", userTemp, cancellationToken));
            }
        }
        catch { }

        try
        {
            var windowsDir = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
            if (!string.IsNullOrWhiteSpace(windowsDir))
            {
                var winTemp = Path.Combine(windowsDir, "Temp");
                items.Add(CreateItem(Category, "C:\\Windows\\Temp", winTemp, cancellationToken));
            }
        }
        catch { }

        return Task.FromResult((IReadOnlyList<ScanItem>)items);
    }
}