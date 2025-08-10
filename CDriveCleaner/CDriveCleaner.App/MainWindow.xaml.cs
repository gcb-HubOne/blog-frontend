using System.Windows;
using CDriveCleaner.App.ViewModels;

namespace CDriveCleaner.App;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        DataContext = new MainViewModel();
    }
}