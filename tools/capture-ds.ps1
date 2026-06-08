# 本物の BizRobo! Design Studio (Java アプリ) のウィンドウをキャプチャする補助スクリプト。
# 使い方: pwsh -File tools/capture-ds.ps1 [出力ファイル名(省略可)]
# 例:     pwsh -File tools/capture-ds.ps1 ds-debug.png
#
# DS を最前面に出して、ウィンドウ領域だけを .capture/ に PNG 保存する。
# 画面共有・学習目的の参照用（本番バンドルには含めない）。

param([string]$OutName = "ds-real.png")

$dir = Join-Path $PSScriptRoot "..\.capture"
New-Item -ItemType Directory -Force $dir | Out-Null

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class DsCap {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
[void][DsCap]::SetProcessDPIAware()

# Java 製の本物 DS（Chrome 等のブラウザタブは除外）
$p = Get-Process | Where-Object {
  $_.MainWindowHandle -ne 0 -and
  $_.ProcessName -match 'java|DesignStudio' -and
  $_.MainWindowTitle -match 'Design Studio' -and
  $_.MainWindowTitle -notmatch 'Chrome|Edge|Firefox'
} | Select-Object -First 1

if (-not $p) { Write-Output "NO_DS_WINDOW (DS を起動してください)"; exit 1 }
$h = $p.MainWindowHandle
if ([DsCap]::IsIconic($h)) { [void][DsCap]::ShowWindow($h, 9) }
[void][DsCap]::SetForegroundWindow($h)
Start-Sleep -Milliseconds 800

$r = New-Object DsCap+RECT
[void][DsCap]::GetWindowRect($h, [ref]$r)
$w = $r.Right - $r.Left; $ht = $r.Bottom - $r.Top
if ($w -le 0 -or $ht -le 0) { Write-Output "BAD_BOUNDS"; exit 1 }

$bmp = New-Object System.Drawing.Bitmap $w, $ht
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, (New-Object System.Drawing.Size($w, $ht)))
$out = Join-Path $dir $OutName
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output ("SAVED: " + (Resolve-Path $out))
Write-Output ("TITLE: " + $p.MainWindowTitle)