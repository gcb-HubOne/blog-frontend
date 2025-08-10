using CDriveCleaner.Core.Utilities;
using Xunit;

namespace CDriveCleaner.Tests;

public class SizeFormatterTests
{
    [Theory]
    [InlineData(0, "0 B")]
    [InlineData(1023, "1023 B")]
    [InlineData(1024, "1 KB")]
    [InlineData(1536, "1.5 KB")]
    [InlineData(1048576, "1 MB")]
    public void FormatsBytesCorrectly(long bytes, string expected)
    {
        var actual = SizeFormatter.FormatBytes(bytes);
        Assert.Equal(expected, actual);
    }
}