# Paste the royalty wallet private key in this window only. It is not sent to Cursor chat.
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\lucas\Documents\projects-jooba-main-20260810T154205Z-1-001\projects-jooba-main"

Write-Host ""
Write-Host "Imp Keeps deploy on Robinhood Chain (4663)"
Write-Host "Royalty / mint signer: 0x53391bf6931E3a8d829029b2a7640f3213cF6C94"
Write-Host "Paste the private key, then Enter. Include the 0x prefix if you have it."
Write-Host ""

$env:DEPLOYER_PRIVATE_KEY = Read-Host "DEPLOYER_PRIVATE_KEY"
if (-not $env:DEPLOYER_PRIVATE_KEY.StartsWith("0x")) {
  $env:DEPLOYER_PRIVATE_KEY = "0x" + $env:DEPLOYER_PRIVATE_KEY
}
$env:MINT_SIGNER = "0x53391bf6931E3a8d829029b2a7640f3213cF6C94"

$forge = Join-Path $env:USERPROFILE ".foundry\bin\forge.exe"
& $forge script script/DeployDungeonKeep.s.sol:DeployDungeonKeep --rpc-url robinhood --broadcast

Remove-Item Env:DEPLOYER_PRIVATE_KEY -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Private key cleared from this session."
Write-Host "Copy the DungeonKeep / Imp Keeps contract address from the broadcast log and paste it in Cursor."
Write-Host ""
