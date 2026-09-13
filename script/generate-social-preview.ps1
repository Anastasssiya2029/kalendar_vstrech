param(
  [string]$OutputPath = "$PSScriptRoot\..\client\public\calendar-link-preview.png"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-Color([int]$alpha, [int]$red, [int]$green, [int]$blue) {
  return [System.Drawing.Color]::FromArgb($alpha, $red, $green, $blue)
}

function New-RoundedPath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

$width = 1200
$height = 630
$bitmap = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

$canvas = [System.Drawing.Rectangle]::new(0, 0, $width, $height)
$background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  $canvas,
  (New-Color 255 253 250 248),
  (New-Color 255 250 246 250),
  18
)
$graphics.FillRectangle($background, $canvas)

# Quiet accent spots echo the application background without competing with the copy.
$graphics.FillEllipse([System.Drawing.SolidBrush]::new((New-Color 54 224 181 210)), -145, 400, 420, 330)
$graphics.FillEllipse([System.Drawing.SolidBrush]::new((New-Color 38 105 93 215)), 650, -160, 550, 370)
$graphics.FillEllipse([System.Drawing.SolidBrush]::new((New-Color 38 244 181 107)), 905, 430, 360, 270)

$shadowPath = New-RoundedPath 716 64 404 504 42
$graphics.FillPath([System.Drawing.SolidBrush]::new((New-Color 28 66 31 67)), $shadowPath)
$shadowPath.Dispose()
$cardPath = New-RoundedPath 704 52 404 504 42
$cardBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  [System.Drawing.Rectangle]::new(704, 52, 404, 504),
  (New-Color 245 255 255 255),
  (New-Color 245 247 237 252),
  135
)
$graphics.FillPath($cardBrush, $cardPath)
$graphics.DrawPath([System.Drawing.Pen]::new((New-Color 180 229 207 232), 2), $cardPath)
$cardPath.Dispose()

$logoPath = Join-Path $PSScriptRoot '..\client\public\diamond-favicon.png'
$logo = [System.Drawing.Image]::FromFile($logoPath)
$graphics.FillEllipse([System.Drawing.SolidBrush]::new((New-Color 42 154 81 207)), 765, 115, 282, 282)
$graphics.DrawImage($logo, [System.Drawing.Rectangle]::new(765, 92, 282, 282))
$logo.Dispose()

$pillPath = New-RoundedPath 764 430 286 56 28
$graphics.FillPath([System.Drawing.SolidBrush]::new((New-Color 255 100 45 112)), $pillPath)
$pillPath.Dispose()

$whiteBrush = [System.Drawing.SolidBrush]::new((New-Color 255 255 255 255))
$headingBrush = [System.Drawing.SolidBrush]::new((New-Color 255 48 29 58))
$bodyBrush = [System.Drawing.SolidBrush]::new((New-Color 255 90 69 99))
$purpleBrush = [System.Drawing.SolidBrush]::new((New-Color 255 112 40 118))
$eyebrowFont = [System.Drawing.Font]::new('Segoe UI', 18, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$titleFont = [System.Drawing.Font]::new('Segoe UI', 58, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$bodyFont = [System.Drawing.Font]::new('Segoe UI', 25, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$pillFont = [System.Drawing.Font]::new('Segoe UI', 16, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

$graphics.DrawString('ВНУТРЕННИЙ СЕРВИС', $eyebrowFont, $purpleBrush, 82, 126)
$graphics.DrawString('Календарь', $titleFont, $headingBrush, 78, 174)
$graphics.DrawString('встреч', $titleFont, $headingBrush, 78, 237)
$graphics.DrawString('Планирование окошек, встреч', $bodyFont, $bodyBrush, 82, 338)
$graphics.DrawString('и работы команды продаж', $bodyFont, $bodyBrush, 82, 374)
$graphics.DrawString('Клиенты • Встречи • Аналитика', $pillFont, $whiteBrush, 786, 449)

$footerPen = [System.Drawing.Pen]::new((New-Color 150 212 190 216), 2)
$graphics.DrawLine($footerPen, 82, 500, 624, 500)
$footerFont = [System.Drawing.Font]::new('Segoe UI', 18, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$graphics.DrawString('Всё необходимое для записи и сопровождения клиента', $footerFont, $bodyBrush, 82, 526)

$bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$footerFont.Dispose(); $pillFont.Dispose(); $bodyFont.Dispose(); $titleFont.Dispose(); $eyebrowFont.Dispose()
$footerPen.Dispose(); $purpleBrush.Dispose(); $bodyBrush.Dispose(); $headingBrush.Dispose(); $whiteBrush.Dispose()
$cardBrush.Dispose(); $background.Dispose(); $graphics.Dispose(); $bitmap.Dispose()

