$env:ELECTRON_RUN_AS_NODE = "1"
$agyNode = "$env:APPDATA\Antigravity\bin\agy-node.cmd"
$antigravityExe = "$env:LOCALAPPDATA\Programs\antigravity\Antigravity.exe"

Set-Location $PSScriptRoot

if (Test-Path $agyNode) {
    & $agyNode server.js
} elseif (Test-Path $antigravityExe) {
    & $antigravityExe server.js
} else {
    node server.js
}
