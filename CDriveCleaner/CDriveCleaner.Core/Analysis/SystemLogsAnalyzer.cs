using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CDriveCleaner.Core.Models;

namespace CDriveCleaner.Core.Analysis;

public class SystemLogsAnalyzer : AnalyzerBase
{
    public override string Category => "System Logs";

    public override Task<IReadOnlyList<ScanItem>> AnalyzeAsync(CancellationToken cancellationToken)
    {
        var items = new List<ScanItem>();
        try
        {
            var windowsDir = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
            if (!string.IsNullOrWhiteSpace(windowsDir))
            {
                var logs = Path.Combine(windowsDir, "Logs");
                items.Add(CreateItem(Category, "Windows Logs", logs, cancellationToken));
            }
        }
        catch { }
        return Task.FromResult((IReadOnlyList<ScanItem>)items);
    }
}