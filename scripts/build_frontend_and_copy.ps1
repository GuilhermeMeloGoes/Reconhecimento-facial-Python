Param()

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $repoRoot 'frontend\templates\frontend-react'
$backendDist = Join-Path $repoRoot 'backend\static\dist'

if (-Not (Test-Path $frontend)) {
    Write-Error "Diretório frontend não encontrado: $frontend"; Exit 1
}

Write-Output "Instalando dependências..."
Push-Location $frontend
if (Test-Path package-lock.json) { npm ci } else { npm install }

Write-Output "Executando build..."
npm run build

Pop-Location

if (-Not (Test-Path (Join-Path $frontend 'dist'))) {
    Write-Error "Build não gerou pasta dist"; Exit 1
}

if (Test-Path $backendDist) { Remove-Item $backendDist -Recurse -Force }
New-Item -ItemType Directory -Path $backendDist -Force | Out-Null
Copy-Item -Path (Join-Path $frontend 'dist\*') -Destination $backendDist -Recurse -Force

Write-Output "Build copiado para $backendDist"
