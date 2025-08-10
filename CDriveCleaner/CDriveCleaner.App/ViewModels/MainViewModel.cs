using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CDriveCleaner.Core.Analysis;
using CDriveCleaner.Core.Models;
using CDriveCleaner.Core.Cleaning;
using CDriveCleaner.Core.Utilities;

namespace CDriveCleaner.App.ViewModels;

public class MainViewModel : ObservableObject
{
    private readonly IAnalyzer[] _analyzers;
    private readonly Cleaner _cleaner;
    private bool _isBusy;

    public ObservableCollection<ScanItem> Items { get; } = new();

    public RelayCommand AnalyzeCommand { get; }
    public RelayCommand CleanCommand { get; }

    public string Summary
    {
        get
        {
            long total = Items.Sum(i => i.SizeBytes);
            long selected = Items.Where(i => i.Selected).Sum(i => i.SizeBytes);
            return $"Found {Items.Count} items • Total {SizeFormatter.FormatBytes(total)} • Selected {SizeFormatter.FormatBytes(selected)}";
        }
    }

    public MainViewModel()
    {
        _analyzers = new IAnalyzer[]
        {
            new TempAnalyzer(),
            new BrowserCacheAnalyzer(),
            new WindowsUpdateCacheAnalyzer(),
            new ThumbnailCacheAnalyzer(),
            new SystemLogsAnalyzer(),
            new RecycleBinAnalyzer()
        };
        _cleaner = new Cleaner();

        AnalyzeCommand = new RelayCommand(() => _ = AnalyzeAsync(), () => !_isBusy);
        CleanCommand = new RelayCommand(() => _ = CleanAsync(), () => !_isBusy && Items.Any(i => i.Selected));
    }

    private async Task AnalyzeAsync()
    {
        if (_isBusy) return;
        _isBusy = true;
        AnalyzeCommand.RaiseCanExecuteChanged();
        CleanCommand.RaiseCanExecuteChanged();

        try
        {
            Items.Clear();
            using var cts = new CancellationTokenSource();
            foreach (var analyzer in _analyzers)
            {
                var results = await analyzer.AnalyzeAsync(cts.Token);
                foreach (var item in results)
                {
                    Items.Add(item);
                }
            }
            RaisePropertyChanged(nameof(Summary));
            CleanCommand.RaiseCanExecuteChanged();
        }
        finally
        {
            _isBusy = false;
            AnalyzeCommand.RaiseCanExecuteChanged();
            CleanCommand.RaiseCanExecuteChanged();
        }
    }

    private async Task CleanAsync()
    {
        if (_isBusy) return;
        _isBusy = true;
        AnalyzeCommand.RaiseCanExecuteChanged();
        CleanCommand.RaiseCanExecuteChanged();

        try
        {
            var toClean = Items.Where(i => i.Selected).ToList();
            await _cleaner.CleanAsync(toClean, null, CancellationToken.None);
            await AnalyzeAsync();
        }
        finally
        {
            _isBusy = false;
            AnalyzeCommand.RaiseCanExecuteChanged();
            CleanCommand.RaiseCanExecuteChanged();
        }
    }
}