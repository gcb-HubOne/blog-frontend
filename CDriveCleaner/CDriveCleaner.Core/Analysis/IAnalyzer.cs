using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CDriveCleaner.Core.Models;

namespace CDriveCleaner.Core.Analysis;

public interface IAnalyzer
{
    Task<IReadOnlyList<ScanItem>> AnalyzeAsync(CancellationToken cancellationToken);
}