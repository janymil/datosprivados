param(
  [string]$Source = "Videos/datosprivados.mp4",
  [string]$OutputDir = "public/video",
  [string]$Basename = "datosprivados",
  [int]$Width = 720,
  [int]$Height = 1280,
  [double]$PosterAt = 59,
  [switch]$RemuxMp4
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Source)) {
  throw "No se encontro el video fuente: $Source"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$webm = Join-Path $OutputDir "$Basename.webm"
$mp4 = Join-Path $OutputDir "$Basename.mp4"
$poster = Join-Path $OutputDir "$Basename-poster.jpg"

$scale = "scale=${Width}:${Height}:flags=lanczos:in_range=pc:out_range=tv,format=yuv420p"

Write-Host "1/3 WebM (VP9 + Opus)..."
ffmpeg -y -v error -i $Source -vf $scale `
  -c:v libvpx-vp9 -crf 34 -b:v 0 -deadline good -cpu-used 3 -row-mt 1 -tile-columns 2 `
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 `
  -c:a libopus -b:a 96k -ac 2 $webm

if ($RemuxMp4) {
  Write-Host "2/3 MP4 (remux H.264 + AAC, faststart)..."
  ffmpeg -y -v error -i $Source -c copy -movflags +faststart $mp4
} else {
  Write-Host "2/3 MP4 (H.264 Main + AAC, fallback)..."
  ffmpeg -y -v error -i $Source -vf $scale `
    -c:v libx264 -profile:v main -level 3.1 -preset slow -crf 24 -pix_fmt yuv420p `
    -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 `
    -movflags +faststart -c:a aac -b:a 128k $mp4
}

Write-Host "3/3 Poster..."
ffmpeg -y -v error -ss $PosterAt -i $Source -frames:v 1 `
  -vf "scale=${Width}:${Height}:flags=lanczos" -q:v 4 $poster

Get-ChildItem $webm, $mp4, $poster | Select-Object Name, Length
