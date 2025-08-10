using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CDriveCleaner.Core.Models;

namespace CDriveCleaner.Core.Analysis;

public class WindowsUpdateCacheAnalyzer : AnalyzerBase
{
    public override string Category => "Windows Update Cache";

    public override Task<IReadOnlyList<ScanItem>> AnalyzeAsync(CancellationToken cancellationToken)
    {
        var items = new List<ScanItem>();
        try
        {
            var windowsDir = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
            if (!string.IsNullOrWhiteSpace(windowsDir))
            {
                var download = Path.Combine(windowsDir, "SoftwareDistribution", "Download");
                items.Add(CreateItem(Category, "SoftwareDistribution\\Download", download, cancellationToken));
            }
        }
        catch { }
        return Task.FromResult((IReadOnlyList<ScanItem>)items);
    }
}