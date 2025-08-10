using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CDriveCleaner.Core.Models;

namespace CDriveCleaner.Core.Analysis;

public class ThumbnailCacheAnalyzer : AnalyzerBase
{
    public override string Category => "Thumbnail Cache";

    public override Task<IReadOnlyList<ScanItem>> AnalyzeAsync(CancellationToken cancellationToken)
    {
        var items = new List<ScanItem>();
        try
        {
            var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            if (!string.IsNullOrWhiteSpace(localAppData))
            {
                var explorer = Path.Combine(localAppData, "Microsoft", "Windows", "Explorer");
                if (Directory.Exists(explorer))
                {
                    var size = Directory.EnumerateFiles(explorer, "thumbcache_*.db", SearchOption.TopDirectoryOnly)
                        .Select(f => new FileInfo(f))
                        .Where(fi => fi.Exists)
                        .Sum(fi => fi.Length);
                    items.Add(new ScanItem
                    {
                        Category = Category,
                        Name = "Explorer thumbnail DBs",
                        Path = explorer,
                        SizeBytes = size,
                        Selected = size > 0
                    });
                }
            }
        }
        catch { }
        return Task.FromResult((IReadOnlyList<ScanItem>)items);
    }
}