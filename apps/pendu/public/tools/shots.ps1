# Captures d'écran du jeu (headless Chromium, Playwright local)
$ErrorActionPreference = "Continue"
$root = "C:\Users\david\Documents\appli perso\Pendu"
$chrome = "C:\Users\david\AppData\Local\ms-playwright\chromium-1248\chrome-win64\chrome.exe"
$out = Join-Path $root "_shots"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$base = "file:///C:/Users/david/Documents/appli%20perso/Pendu/index.html"

$shots = @(
  @{ name = "01-accueil"; url = "$base" },
  @{ name = "02-partie";  url = "$base`?demo=1&mode=classique&word=MAISON&letters=E,A,S,O,N,T" },
  @{ name = "03-indices"; url = "$base`?demo=1&mode=indices&word=BIBLIOTHEQUE&letters=E,I,T,Q" },
  @{ name = "04-regles";  url = "$base`?screen=rules" },
  @{ name = "05-reglages"; url = "$base`?screen=settings" },
  @{ name = "06-mobile";  url = "$base`?demo=1&mode=theme&word=CHAT&letters=A" }
)

foreach ($s in $shots) {
  $file = Join-Path $out ($s.name + ".png")
  $args = @(
    "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
    "--disable-lcd-text", "--force-device-scale-factor=1",
    "--window-size=1440,900", "--virtual-time-budget=4000",
    "--screenshot=$file",
    "--user-data-dir=$env:TEMP\pendu-shot-" + $s.name,
    $s.url
  )
  if ($s.name -eq "06-mobile") {
    $args = @(
      "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
      "--force-device-scale-factor=1", "--window-size=390,844",
      "--virtual-time-budget=4000", "--screenshot=$file",
      "--user-data-dir=$env:TEMP\pendu-shot-mobile", $s.url
    )
  }
  & $chrome @args 2>$null
  if (Test-Path $file) { Write-Host "OK $($s.name)" } else { Write-Host "FAIL $($s.name)" }
}
