Add-Type -AssemblyName System.Drawing
$imgPath = Resolve-Path "public/logo.png"
$bmp = [System.Drawing.Bitmap]::FromFile($imgPath)

# Crop emblem (left side where the round emblem is, from x=0 to x=360, y=0 to y=341)
$rect = New-Object System.Drawing.Rectangle(0, 0, 360, 341)
$emblem = $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$emblem.Save((Join-Path (Get-Location) "public/emblem.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$emblem.Save((Join-Path (Get-Location) "src/assets/emblem.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$emblem.Dispose()
$bmp.Dispose()
Write-Output "Emblem created successfully"
