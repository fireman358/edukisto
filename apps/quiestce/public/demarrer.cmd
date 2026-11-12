@echo off
setlocal
cd /d "%~dp0"
title Qui suis-je ? - serveur local

rem Ouvre le navigateur après un court délai, quand le serveur est prêt.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process 'http://127.0.0.1:8080/'"

where node >nul 2>nul
if %errorlevel%==0 (
  echo Demarrage avec Node.js...
  node serve.mjs 8080
  goto :fin
)

where python >nul 2>nul
if %errorlevel%==0 (
  echo Demarrage avec Python...
  python -m http.server 8080 --bind 127.0.0.1
  goto :fin
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo Demarrage avec Python...
  py -m http.server 8080 --bind 127.0.0.1
  goto :fin
)

echo.
echo Node.js ou Python est necessaire pour lancer le serveur local.
echo Vous pouvez quand meme ouvrir index.html directement : le jeu fonctionnera,
echo mais l'installation en application web ne sera pas proposee.
echo.
pause

:fin
endlocal
