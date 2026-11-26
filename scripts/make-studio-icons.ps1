# Erzeugt die violetten Symbole für „WhatsUp Studio“ aus den normalen (blauen) WhatsUp-Symbolen.
# Es wird nur der Farbton gedreht (Blau -> Violett); Weiß, Helligkeit und Transparenz bleiben gleich.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/make-studio-icons.ps1
param([double]$Shift = 60)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class HueShift {
  public static void Run(string src, string dst, double shift) {
    using (var input = new Bitmap(src))
    using (var bmp = new Bitmap(input.Width, input.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(bmp)) g.DrawImage(input, 0, 0, input.Width, input.Height);
      var rect = new Rectangle(0, 0, bmp.Width, bmp.Height);
      var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      var px = new byte[data.Stride * bmp.Height];
      Marshal.Copy(data.Scan0, px, 0, px.Length);
      for (int i = 0; i < px.Length; i += 4) {
        double b = px[i] / 255.0, gr = px[i + 1] / 255.0, r = px[i + 2] / 255.0;
        double max = Math.Max(r, Math.Max(gr, b)), min = Math.Min(r, Math.Min(gr, b)), d = max - min;
        if (d < 1e-6) continue; // Grau/Weiß: kein Farbton
        double h;
        if (max == r) h = 60 * (((gr - b) / d) % 6);
        else if (max == gr) h = 60 * ((b - r) / d + 2);
        else h = 60 * ((r - gr) / d + 4);
        double s = d / max, v = max;
        h = ((h + shift) % 360 + 360) % 360;
        double c = v * s, x = c * (1 - Math.Abs((h / 60) % 2 - 1)), m = v - c;
        double r2, g2, b2;
        if (h < 60) { r2 = c; g2 = x; b2 = 0; }
        else if (h < 120) { r2 = x; g2 = c; b2 = 0; }
        else if (h < 180) { r2 = 0; g2 = c; b2 = x; }
        else if (h < 240) { r2 = 0; g2 = x; b2 = c; }
        else if (h < 300) { r2 = x; g2 = 0; b2 = c; }
        else { r2 = c; g2 = 0; b2 = x; }
        px[i] = (byte)Math.Round((b2 + m) * 255);
        px[i + 1] = (byte)Math.Round((g2 + m) * 255);
        px[i + 2] = (byte)Math.Round((r2 + m) * 255);
      }
      Marshal.Copy(px, 0, data.Scan0, px.Length);
      bmp.UnlockBits(data);
      bmp.Save(dst, ImageFormat.Png);
    }
  }
}
"@

$root = Split-Path -Parent $PSScriptRoot
$pairs = @(
  @('src\assets\logo.png', 'src\assets\logo-studio.png'),
  @('build\icon.png', 'build\icon-studio.png'),
  @('web\icons\icon-512.png', 'web\icons-studio\icon-512.png'),
  @('web\icons\icon-192.png', 'web\icons-studio\icon-192.png'),
  @('web\icons\apple-touch-icon.png', 'web\icons-studio\apple-touch-icon.png')
)
New-Item -ItemType Directory -Force (Join-Path $root 'web\icons-studio') | Out-Null
foreach ($p in $pairs) {
  [HueShift]::Run((Join-Path $root $p[0]), (Join-Path $root $p[1]), $Shift)
  "erzeugt: $($p[1])"
}
