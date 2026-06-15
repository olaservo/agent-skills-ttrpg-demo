# Allow the phone (and other LAN devices) to reach the reachy-dm dev servers.
# Run elevated (Administrator). Adds an inbound TCP allow rule on the Private
# network profile for the dev/test/demo ports. Remove later with:
#   Remove-NetFirewallRule -DisplayName "reachy-dm-dev-LAN"
$name = "reachy-dm-dev-LAN"
# Always remove any existing rule of this name first, then recreate it correctly
# scoped. An earlier broken paste created an over-broad "allow ALL inbound (any
# protocol/port/profile)" rule under this name; this guarantees we end up with the
# narrow, intended rule instead.
if (Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue) {
  Remove-NetFirewallRule -DisplayName $name
  Write-Host "Removed pre-existing '$name' rule (re-creating with correct scope)." -ForegroundColor Yellow
}
New-NetFirewallRule -DisplayName $name `
  -Direction Inbound -Action Allow -Protocol TCP `
  -LocalPort 3001, 3030, 5173, 5174 -Profile Private | Out-Null
Write-Host "Created '$name' (TCP 3001,3030,5173,5174 inbound, Private only)." -ForegroundColor Green
Write-Host ""
Write-Host "Done. You can close this window."
