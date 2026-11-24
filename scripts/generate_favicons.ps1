Add-Type -AssemblyName System.Drawing

function Create-Favicon {
    param(
        [int]$size,
        [string]$outPath
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # 1. Rounded rectangle background (Squircle)
    $radius = [Math]::Max(2, [int]($size * 0.22))
    $rect = New-Object System.Drawing.Rectangle(0, 0, ($size - 1), ($size - 1))
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    
    $path.AddArc($rect.X, $rect.Y, ($radius * 2), ($radius * 2), 180, 90)
    $path.AddArc(($rect.Right - ($radius * 2)), $rect.Y, ($radius * 2), ($radius * 2), 270, 90)
    $path.AddArc(($rect.Right - ($radius * 2)), ($rect.Bottom - ($radius * 2)), ($radius * 2), ($radius * 2), 0, 90)
    $path.AddArc($rect.X, ($rect.Bottom - ($radius * 2)), ($radius * 2), ($radius * 2), 90, 90)
    $path.CloseFigure()
    
    # Royal blue gradient (#2563EB -> #1E3A8A)
    $colorTop = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)   # #2563EB
    $colorBot = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)    # #0F172A
    $brushBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $colorTop, $colorBot, [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
    $g.FillPath($brushBg, $path)
    
    # Subtle inner border for contrast on both dark and light browser bars
    $penHighlight = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 255, 255, 255), 1)
    $g.DrawPath($penHighlight, $path)

    # 2. Bold Letter 'S' in Crisp White
    $fontSize = $size * 0.58
    if ($size -le 16) { $fontSize = 10 }
    
    $fontFamily = New-Object System.Drawing.FontFamily('Arial')
    $font = New-Object System.Drawing.Font($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    # Slight upward offset to leave room for the bridge accent
    $textYOffset = -($size * 0.05)
    $textRect = New-Object System.Drawing.RectangleF(0, $textYOffset, $size, $size)
    $brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.DrawString('S', $font, $brushWhite, $textRect, $sf)
    
    # 3. Golden Saffron 'Setu' (Bridge) Accent Arc
    if ($size -gt 16) {
        $arcPenWidth = [Math]::Max(1.5, ($size * 0.08))
        $arcPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 245, 158, 11), $arcPenWidth)
        $arcPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $arcPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        
        $arcW = $size * 0.62
        $arcH = $size * 0.22
        $arcX = ($size - $arcW) / 2.0
        $arcY = $size * 0.76
        
        $g.DrawArc($arcPen, [float]$arcX, [float]$arcY, [float]$arcW, [float]$arcH, 15, 150)
        $arcPen.Dispose()
    } else {
        # At 16px: Crisp 2px golden accent line
        $arcPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 245, 158, 11), 2)
        $arcPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $arcPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $g.DrawLine($arcPen, 4, 13, 11, 13)
        $arcPen.Dispose()
    }
    
    # Cleanup
    $brushWhite.Dispose()
    $penHighlight.Dispose()
    $brushBg.Dispose()
    $path.Dispose()
    $font.Dispose()
    $fontFamily.Dispose()
    $g.Dispose()
    
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated: $outPath ($size x $size)"
}

# Generate PNGs
Create-Favicon -size 16  -outPath "public/favicon-16x16.png"
Create-Favicon -size 32  -outPath "public/favicon-32x32.png"
Create-Favicon -size 48  -outPath "public/favicon-48x48.png"
Create-Favicon -size 64  -outPath "public/favicon.png"
Create-Favicon -size 180 -outPath "public/apple-touch-icon.png"

# Also generate favicon.ico (multi-size ICO container with 16, 32, 48)
function Build-Ico([string[]]$pngPaths, [string]$icoPath) {
    $fs = [System.IO.File]::Create($icoPath)
    $bw = New-Object System.IO.BinaryWriter($fs)
    
    # ICONDIR header: idReserved (0), idType (1 for ICO), idCount (number of images)
    $count = $pngPaths.Length
    $bw.Write([uint16]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]$count)
    
    $pngBytesList = @()
    foreach ($p in $pngPaths) {
        $pngBytesList += ,([System.IO.File]::ReadAllBytes($p))
    }
    
    # Calculate offset for image data: 6 (ICONDIR) + 16 * count (ICONDIRENTRYs)
    $offset = 6 + (16 * $count)
    
    for ($i = 0; $i -lt $count; $i++) {
        $bytes = $pngBytesList[$i]
        $bmpTemp = [System.Drawing.Bitmap]::FromFile($pngPaths[$i])
        $w = $bmpTemp.Width
        $h = $bmpTemp.Height
        $bmpTemp.Dispose()
        
        $bWidth = if ($w -ge 256) { [byte]0 } else { [byte]$w }
        $bHeight = if ($h -ge 256) { [byte]0 } else { [byte]$h }
        
        $bw.Write($bWidth)                    # bWidth
        $bw.Write($bHeight)                   # bHeight
        $bw.Write([byte]0)                    # bColorCount
        $bw.Write([byte]0)                    # bReserved
        $bw.Write([uint16]1)                  # wPlanes
        $bw.Write([uint16]32)                 # wBitCount
        $bw.Write([uint32]$bytes.Length)      # dwBytesInRes
        $bw.Write([uint32]$offset)            # dwImageOffset
        
        $offset += $bytes.Length
    }
    
    # Write image data
    for ($i = 0; $i -lt $count; $i++) {
        $bw.Write($pngBytesList[$i])
    }
    
    $bw.Close()
    $fs.Close()
    Write-Host "Generated multi-resolution ICO: $icoPath"
}

Build-Ico -pngPaths @("public/favicon-16x16.png", "public/favicon-32x32.png", "public/favicon-48x48.png") -icoPath "public/favicon.ico"
