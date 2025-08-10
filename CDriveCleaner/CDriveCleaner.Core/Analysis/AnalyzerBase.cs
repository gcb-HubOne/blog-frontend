using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CDriveCleaner.Core.Models;
using CDriveCleaner.Core.Utilities;

namespace CDriveCleaner.Core.Analysis;

public abstract class AnalyzerBase : IAnalyzer
{
    public abstract string Category { get; }

    public abstract Task<IReadOnlyList<ScanItem>> AnalyzeAsync(CancellationToken cancellationToken);

    protected static ScanItem CreateItem(string category, string name, string path, CancellationToken cancellationToken)
    {
        long size = 0;
        if (Directory.Exists(path) || File.Exists(path))
        {
            size = FileSystemHelper.TryComputeSize(path, cancellationToken);
        }
        return new ScanItem
        {
            Category = category,
            Name = name,
            Path = path,
            SizeBytes = size,
            Selected = size > 0
        };
    }

    protected static IEnumerable<string> SafeEnumerateDirectories(string root)
    {
        try
        {
            return Directory.EnumerateDirectories(root);
        }
        catch
        {
            return Enumerable.Empty<string>();
        }
    }
}