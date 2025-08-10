using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CDriveCleaner.Core.Models;
using CDriveCleaner.Core.Utilities;

namespace CDriveCleaner.Core.Analysis;

public class RecycleBinAnalyzer : AnalyzerBase
{
    public override string Category => "Recycle Bin";

    public override Task<IReadOnlyList<ScanItem>> AnalyzeAsync(CancellationToken cancellationToken)
    {
        var items = new List<ScanItem>();
        foreach (var drive in DriveInfo.GetDrives().Where(d => d.DriveType == DriveType.Fixed && d.IsReady))
        {
            var recyclePath = Path.Combine(drive.RootDirectory.FullName, "$Recycle.Bin");
            long size = FileSystemHelper.TryComputeSize(recyclePath, cancellationToken);
            items.Add(new ScanItem
            {
                Category = Category,
                Name = $"Recycle Bin ({drive.Name})",
                Path = recyclePath,
                SizeBytes = size,
                Selected = size > 0
            });
        }
        return Task.FromResult((IReadOnlyList<ScanItem>)items);
    }
}