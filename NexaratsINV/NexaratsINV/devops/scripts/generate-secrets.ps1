# Nexarats Secret Generator for Local Development

function Generate-Secret {
    return [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 255) }))
}

$devEnvPath = "C:\Users\Jaya Krishna Sai\Downloads\Nexarats\Inventory\NexaratsINV\NexaratsINV\devops\env\.env.development"

if (Test-Path $devEnvPath) {

    Write-Host "Generating fresh secrets for .env.development..."

    $jwtSecret = Generate-Secret
    $jwtRefreshSecret = Generate-Secret
    $waApiKey = Generate-Secret

    (Get-Content $devEnvPath) | ForEach-Object {
        $_ -replace "^JWT_SECRET=.*", "JWT_SECRET=$jwtSecret" `
           -replace "^JWT_REFRESH_SECRET=.*", "JWT_REFRESH_SECRET=$jwtRefreshSecret" `
           -replace "^WA_API_KEY=.*", "WA_API_KEY=$waApiKey"
    } | Set-Content $devEnvPath

    Write-Host "Success! JWT_SECRET, JWT_REFRESH_SECRET, and WA_API_KEY have been updated."

}
else {

    Write-Host "Error: .env.development not found at $devEnvPath"

}