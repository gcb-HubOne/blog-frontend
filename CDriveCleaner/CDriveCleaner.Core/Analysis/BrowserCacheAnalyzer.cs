using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CDriveCleaner.Core.Models;

namespace CDriveCleaner.Core.Analysis;

public class BrowserCacheAnalyzer : AnalyzerBase
{
    public override string Category => "Browser Cache";

    public override Task<IReadOnlyList<ScanItem>> AnalyzeAsync(CancellationToken cancellationToken)
    {
        var items = new List<ScanItem>();
        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var roamingAppData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);

        if (!string.IsNullOrWhiteSpace(localAppData))
        {
            // Chrome
            var chromeDefault = Path.Combine(localAppData, "Google", "Chrome", "User Data", "Default");
            items.AddRange(CacheSubfolders("Chrome", chromeDefault, new[] { "Cache", "Code Cache", "GPUCache" }, cancellationToken));

            // Edge
            var edgeDefault = Path.Combine(localAppData, "Microsoft", "Edge", "User Data", "Default");
            items.AddRange(CacheSubfolders("Edge", edgeDefault, new[] { "Cache", "Code Cache", "GPUCache" }, cancellationToken));
        }

        if (!string.IsNullOrWhiteSpace(roamingAppData))
        {
            // Firefox profiles are under Roaming and Local with same profile names
            var firefoxProfiles = Path.Combine(roamingAppData, "Mozilla", "Firefox", "Profiles");
            if (Directory.Exists(firefoxProfiles))
            {
                foreach (var profile in Directory.EnumerateDirectories(firefoxProfiles))
                {
                    var cache2 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Mozilla", "Firefox", "Profiles", Path.GetFileName(profile)!, "cache2");
                    items.Add(CreateItem(Category, $"Firefox {Path.GetFileName(profile)} cache2", cache2, cancellationToken));
                }
            }
        }

        return Task.FromResult((IReadOnlyList<ScanItem>)items);
    }

    private IEnumerable<ScanItem> CacheSubfolders(string browser, string root, IEnumerable<string> subfolders, CancellationToken token)
    {
        if (!Directory.Exists(root)) yield break;
        foreach (var folder in subfolders)
        {
            var path = Path.Combine(root, folder);
            yield return CreateItem(Category, $"{browser} {folder}", path, token);
        }
    }
}