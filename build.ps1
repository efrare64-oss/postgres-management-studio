$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# 1. Build do frontend (React/Vite). cmd /c redireciona stderr do node (warnings)
#    para stdout, evitando que o PowerShell trate avisos como erros.
#    (EN) Frontend build (React/Vite). cmd /c redirects node stderr (warnings)
#    to stdout, so PowerShell doesn't treat warnings as errors.
Push-Location web
cmd /c "npm run build 2>&1"
if ($LASTEXITCODE -ne 0) { throw 'Frontend build falhou' }
Pop-Location

# 2. Copia o build para os assets embutidos no binario
#    (EN) Copies the build into the assets embedded in the binary
if (Test-Path internal\assets\dist) { Remove-Item internal\assets\dist -Recurse -Force }
Copy-Item web\dist internal\assets\dist -Recurse

# 3. Gera o executavel unico (sem console, janela desktop)
#    (EN) Generates the single executable (no console, desktop window)
go build -trimpath -ldflags "-H windowsgui -s -w" -o "PostgresManagementStudio.exe" ./cmd/desktop
if ($LASTEXITCODE -ne 0) { throw 'go build falhou' }

Write-Host ""
Write-Host "OK: PostgresManagementStudio.exe gerado na raiz do projeto."
Write-Host "Execute o arquivo para abrir o aplicativo (unico executavel)."