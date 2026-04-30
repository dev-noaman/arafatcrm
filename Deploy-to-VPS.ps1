<#
.SYNOPSIS
    Remote VPS deployment script for ArafatCRM

.DESCRIPTION
    This script automates remote VPS deployment of ArafatCRM (real estate CRM).
    It handles frontend build, file transfer via rsync/scp, backend setup,
    TypeORM migrations, PM2 process management, and Nginx configuration.

.PARAMETER Init
    Run initial setup (first deployment - includes installing dependencies, database creation, seeding)

.PARAMETER SkipFrontend
    Skip frontend build and deployment

.PARAMETER SkipBackend
    Skip backend deployment

.PARAMETER SkipTests
    Skip the health check verification after deployment

.EXAMPLE
    .\Deploy-to-VPS.ps1
    Deploy update to VPS (frontend and backend)

.EXAMPLE
    .\Deploy-to-VPS.ps1 -Init
    Run initial VPS setup (first time deployment)

.EXAMPLE
    .\Deploy-to-VPS.ps1 -SkipFrontend
    Deploy only backend changes

.EXAMPLE
    .\Deploy-to-VPS.ps1 -SkipBackend
    Deploy only frontend changes
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [switch]$Init,

    [Parameter(Mandatory=$false)]
    [switch]$SkipFrontend,

    [Parameter(Mandatory=$false)]
    [switch]$SkipBackend,

    [Parameter(Mandatory=$false)]
    [switch]$SkipTests
)

# Script configuration
$ErrorActionPreference = "Stop"
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# VPS Configuration - UPDATE THESE VALUES
$VpsHost = "72.62.189.36"
$VpsUser = "root"
$VpsPassword = "Swa@Adel2022"
$VpsDomain = "arafatcrm.cloud"
$VpsPath = "/var/www/arafatcrm"
$DbName = "arafat_crm"
$DbUser = "arafatcrm"
$DbPassword = "ArafatCrm2024!"
$BackendPort = 3001

# Color configuration for output
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
    Step = "Magenta"
}

#region Helper Functions

function Write-Log {
    param(
        [string]$Message,
        [string]$Color = "White"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"

    Write-Host $logMessage -ForegroundColor $Color
}

function Test-Prerequisites {
    Write-Log "Validating prerequisites..." -Color $Colors.Step

    $scpAvailable = Get-Command scp -ErrorAction SilentlyContinue
    $sshAvailable = Get-Command ssh -ErrorAction SilentlyContinue
    $pscpAvailable = Get-Command pscp -ErrorAction SilentlyContinue
    $plinkAvailable = Get-Command plink -ErrorAction SilentlyContinue

    if (-not ($scpAvailable -and $sshAvailable) -and -not ($pscpAvailable -and $plinkAvailable)) {
        Write-Log "ERROR: Neither OpenSSH nor PuTTY tools found. Please install one of them." -Color $Colors.Error
        return $false
    }

    if ($scpAvailable -and $sshAvailable) {
        Write-Log "Using OpenSSH for SSH/SCP" -Color $Colors.Success
        $script:UseOpenSSH = $true
    } else {
        Write-Log "Using PuTTY tools for SSH/SCP" -Color $Colors.Success
        $script:UseOpenSSH = $false
    }

    $nodeAvailable = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeAvailable) {
        Write-Log "ERROR: Node.js not found. Please install Node.js." -Color $Colors.Error
        return $false
    }
    Write-Log "Node.js version: $(node --version)" -Color $Colors.Info

    $pnpmAvailable = Get-Command pnpm -ErrorAction SilentlyContinue
    if (-not $pnpmAvailable) {
        Write-Log "WARNING: pnpm not found locally. Frontend build may fail." -Color $Colors.Warning
    } else {
        Write-Log "pnpm version: $(pnpm --version)" -Color $Colors.Info
    }

    if (-not $SkipFrontend) {
        $frontendPath = Join-Path $ScriptPath "frontend/src"
        if (-not (Test-Path $frontendPath)) {
            Write-Log "ERROR: Frontend source directory not found: $frontendPath" -Color $Colors.Error
            return $false
        }
    }

    if (-not $SkipBackend) {
        $backendPath = Join-Path $ScriptPath "backend/src"
        if (-not (Test-Path $backendPath)) {
            Write-Log "ERROR: Backend source directory not found: $backendPath" -Color $Colors.Error
            return $false
        }
    }

    Write-Log "Prerequisites validated successfully" -Color $Colors.Success
    return $true
}

function Test-SshConnection {
    Write-Log "Testing SSH connection to VPS..." -Color $Colors.Info

    try {
        if ($script:UseOpenSSH) {
            $testCommand = "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${VpsUser}@${VpsHost} `"echo OK`""
        } else {
            $testCommand = "plink -pw `"$VpsPassword`" -batch ${VpsUser}@${VpsHost} `"echo OK`""
        }

        $result = Invoke-Expression $testCommand 2>&1 | Out-String

        if ($result -match "OK") {
            Write-Log "SSH connection test successful" -Color $Colors.Success
            return $true
        } else {
            Write-Log "SSH connection test failed: $result" -Color $Colors.Error
            return $false
        }
    }
    catch {
        Write-Log "Error testing SSH connection: $_" -Color $Colors.Error
        return $false
    }
}

function Invoke-VpsCommand {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Command,
        [switch]$ReturnOutput,
        [switch]$Silent
    )

    if (-not $Silent) {
        Write-Log "Executing on VPS: $Command" -Color $Colors.Info
    }

    try {
        # Run via cmd.exe so stderr is merged into stdout at the OS level. Otherwise
        # PowerShell 5.1 converts every stderr line ssh forwards (e.g. "nginx [warn]")
        # into a NativeCommandError ErrorRecord that surfaces as a terminating error
        # right at the call site, even with try/catch and -ErrorAction tweaks.
        if ($script:UseOpenSSH) {
            $sshLine = "ssh -o StrictHostKeyChecking=no ${VpsUser}@${VpsHost} `"$Command`" 2>&1"
        } else {
            $sshLine = "plink -pw `"$VpsPassword`" -batch ${VpsUser}@${VpsHost} `"$Command`" 2>&1"
        }
        $rawOutput = & cmd /c $sshLine
        $exitCode = $LASTEXITCODE

        $resultString = if ($rawOutput) { ($rawOutput -join "`n") } else { "" }

        if ($ReturnOutput) {
            return $resultString
        }

        return $true
    }
    catch {
        if (-not $Silent) {
            Write-Log "Error executing command: $_" -Color $Colors.Error
        }
        throw
    }
}

function Invoke-VpsScript {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Script,
        [switch]$Silent
    )

    if (-not $Silent) {
        Write-Log "Executing script on VPS..." -Color $Colors.Info
    }

    $tempFile = Join-Path $env:TEMP "vps-deploy-$(Get-Random).sh"
    try {
        # CRLF would break bash on the VPS (line 1: set: -, $'\r': command not found).
        # PowerShell heredocs can include \r\n; force LF before writing.
        $normalizedScript = $Script -replace "`r`n", "`n"
        [System.IO.File]::WriteAllText($tempFile, $normalizedScript, [System.Text.UTF8Encoding]::new($false))

        # Copy script to VPS
        $remoteScript = "/tmp/vps-deploy-$(Get-Random).sh"
        if ($script:UseOpenSSH) {
            & scp -o StrictHostKeyChecking=no $tempFile "${VpsUser}@${VpsHost}:${remoteScript}" 2>&1 | Out-Null
        } else {
            & pscp -pw "$VpsPassword" -batch $tempFile "${VpsUser}@${VpsHost}:${remoteScript}" 2>&1 | Out-Null
        }

        # Execute and get output
        $result = Invoke-VpsCommand -Command "bash $remoteScript; rm -f $remoteScript" -ReturnOutput -Silent
        return $result
    }
    finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
    }
}

function Copy-ToVps {
    param(
        [Parameter(Mandatory=$true)]
        [string]$LocalPath,
        [Parameter(Mandatory=$true)]
        [string]$RemotePath,
        [switch]$Recursive,
        [string[]]$Exclude = @()
    )

    Write-Log "Transferring to VPS: $LocalPath -> $RemotePath" -Color $Colors.Info

    if (-not (Test-Path $LocalPath)) {
        throw "Local path not found: $LocalPath"
    }

    try {
        Invoke-VpsCommand -Command "mkdir -p $RemotePath" -Silent | Out-Null

        if ($script:UseOpenSSH) {
            $rsyncAvailable = Get-Command rsync -ErrorAction SilentlyContinue

            if ($rsyncAvailable) {
                $excludeArgs = ($Exclude | ForEach-Object { "--exclude='$_'" }) -join " "
                $rsyncCommand = "rsync -avz --delete $excludeArgs -e `"ssh -o StrictHostKeyChecking=no`" `"$LocalPath/`" ${VpsUser}@${VpsHost}:$RemotePath/"
                $result = Invoke-Expression $rsyncCommand 2>&1
            } else {
                # Use tar pipe over SSH for reliable directory transfer (avoids nested dir issue with scp)
                $excludeTar = ($Exclude | ForEach-Object { "--exclude='$_'" }) -join " "
                $tarCmd = "tar -cf - -C '$LocalPath' $excludeTar . | ssh -o StrictHostKeyChecking=no ${VpsUser}@${VpsHost} `"cd $RemotePath && tar -xf -`""
                $result = Invoke-Expression $tarCmd 2>&1
            }
        } else {
            $scpArgs = if ($Recursive) { "-r" } else { "" }
            $scpCommand = "pscp -pw `"$VpsPassword`" -batch $scpArgs `"$LocalPath`" ${VpsUser}@${VpsHost}:$RemotePath/"
            $result = Invoke-Expression $scpCommand 2>&1
        }

        if ($LASTEXITCODE -eq 0) {
            Write-Log "Transfer completed successfully" -Color $Colors.Success
            return $true
        } else {
            Write-Log "Transfer may have issues: $result" -Color $Colors.Warning
            return $true
        }
    }
    catch {
        Write-Log "Transfer error: $_" -Color $Colors.Error
        throw
    }
}

#endregion

#region Build Functions

function Build-Frontend {
    Write-Log "========================================" -Color $Colors.Step
    Write-Log "Building Frontend" -Color $Colors.Step
    Write-Log "========================================" -Color $Colors.Step

    try {
        Write-Log "Installing dependencies..." -Color $Colors.Info
        & pnpm install 2>&1 | Out-Null
        Write-Log "Dependencies installed" -Color $Colors.Success

        $env:VITE_API_URL = "/api/v1"

        Write-Log "Building frontend (Vite)..." -Color $Colors.Info
        & pnpm --filter frontend build | Out-Null

        $distPath = Join-Path $ScriptPath "frontend/dist"
        if (-not (Test-Path $distPath)) {
            Write-Log "ERROR: Build output not found at $distPath" -Color $Colors.Error
            return $false
        }

        $distSize = (Get-ChildItem -Path $distPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Log "Frontend built successfully ($([math]::Round($distSize, 2)) MB)" -Color $Colors.Success
        return $true
    }
    catch {
        Write-Log "Frontend build error: $_" -Color $Colors.Error
        return $false
    }
}

#endregion

#region Deployment Functions

function Deploy-Frontend {
    Write-Log "========================================" -Color $Colors.Step
    Write-Log "Deploying Frontend to VPS" -Color $Colors.Step
    Write-Log "========================================" -Color $Colors.Step

    try {
        $distPath = Join-Path $ScriptPath "frontend/dist"

        if (-not (Test-Path $distPath)) {
            Write-Log "ERROR: frontend/dist directory not found. Run build first." -Color $Colors.Error
            return $false
        }

        Write-Log "Transferring frontend files..." -Color $Colors.Info
        $tempTar = Join-Path $env:TEMP "frontend-deploy.tar.gz"
        & tar -czf $tempTar -C $distPath .
        & scp -o StrictHostKeyChecking=no $tempTar "${VpsUser}@${VpsHost}:/tmp/frontend-deploy.tar.gz"
        Invoke-VpsCommand -Command "cd $VpsPath/frontend && rm -rf * && tar -xzf /tmp/frontend-deploy.tar.gz && rm -f /tmp/frontend-deploy.tar.gz" -Silent
        Remove-Item $tempTar -Force -ErrorAction SilentlyContinue

        Write-Log "Frontend deployed successfully" -Color $Colors.Success
        return $true
    }
    catch {
        Write-Log "Frontend deployment failed: $_" -Color $Colors.Error
        return $false
    }
}

function Deploy-Backend {
    Write-Log "========================================" -Color $Colors.Step
    Write-Log "Deploying Backend to VPS" -Color $Colors.Step
    Write-Log "========================================" -Color $Colors.Step

    try {
        # Transfer backend source (excluding node_modules, .env, dist, coverage)
        Write-Log "Transferring backend source files..." -Color $Colors.Info
        $backendTar = Join-Path $env:TEMP "backend-deploy.tar.gz"
        & tar -czf $backendTar -C $ScriptPath --exclude="node_modules" --exclude=".env" --exclude="dist" --exclude="coverage" --exclude="test" backend
        & scp -o StrictHostKeyChecking=no $backendTar "${VpsUser}@${VpsHost}:/tmp/backend-deploy.tar.gz"
        Invoke-VpsCommand -Command "cd $VpsPath && rm -rf backend/src backend/test backend/*.json backend/*.ts && tar -xzf /tmp/backend-deploy.tar.gz && rm -f /tmp/backend-deploy.tar.gz" -Silent
        Remove-Item $backendTar -Force -ErrorAction SilentlyContinue

        # Transfer shared package (needed by pnpm workspace)
        Write-Log "Transferring shared package..." -Color $Colors.Info
        $sharedTar = Join-Path $env:TEMP "shared-deploy.tar.gz"
        & tar -czf $sharedTar -C $ScriptPath --exclude="node_modules" --exclude="dist" packages
        & scp -o StrictHostKeyChecking=no $sharedTar "${VpsUser}@${VpsHost}:/tmp/shared-deploy.tar.gz"
        Invoke-VpsCommand -Command "cd $VpsPath && rm -rf packages/shared/src packages/shared/*.json packages/shared/*.ts && tar -xzf /tmp/shared-deploy.tar.gz && rm -f /tmp/shared-deploy.tar.gz" -Silent
        Remove-Item $sharedTar -Force -ErrorAction SilentlyContinue

        # Transfer workspace root files via scp (individual files)
        Write-Log "Transferring workspace config files..." -Color $Colors.Info
        foreach ($f in @("pnpm-workspace.yaml", "package.json", "tsconfig.json", "tsconfig.base.json", ".npmrc", "pnpm-lock.yaml")) {
            $filePath = Join-Path $ScriptPath $f
            if (Test-Path $filePath) {
                & scp -o StrictHostKeyChecking=no $filePath "${VpsUser}@${VpsHost}:${VpsPath}/" 2>&1 | Out-Null
            }
        }

        Write-Log "Backend files deployed successfully" -Color $Colors.Success
        return $true
    }
    catch {
        Write-Log "Backend deployment failed: $_" -Color $Colors.Error
        return $false
    }
}

function Initialize-VpsEnvironment {
    Write-Log "========================================" -Color $Colors.Step
    Write-Log "Initial VPS Setup" -Color $Colors.Step
    Write-Log "========================================" -Color $Colors.Step

    try {
        Write-Log "Installing system dependencies..." -Color $Colors.Info

        $initScript = @"
set -e

echo "=== Installing system dependencies ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

node --version
npm --version

# Install pnpm globally
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi
pnpm --version

# Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
    apt-get update
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi

# Install PM2 globally
npm install -g pm2

# Install rsync and certbot
apt-get install -y rsync certbot python3-certbot-nginx

echo "=== Creating directories ==="
mkdir -p $VpsPath/frontend $VpsPath/backend $VpsPath/packages/shared $VpsPath/uploads

echo "=== Configuring database ==="
pm2 stop arafatcrm-api 2>/dev/null || true
pm2 delete arafatcrm-api 2>/dev/null || true

systemctl start postgresql 2>/dev/null || true
sleep 2

if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DbName; then
    echo "Creating new database and user..."
    sudo -u postgres psql -c "CREATE USER $DbUser WITH PASSWORD '$DbPassword';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE $DbName OWNER $DbUser;"
    sudo -u postgres psql -d $DbName -c "GRANT ALL ON SCHEMA public TO $DbUser;"
else
    echo "Database already exists - preserving data"
fi

echo "INIT_DEPS_COMPLETE"
"@

        $result = Invoke-VpsScript -Script $initScript

        if ($result -match "INIT_DEPS_COMPLETE") {
            Write-Log "System dependencies installed" -Color $Colors.Success
            return $true
        }

        Write-Log "Initial dependency install did not complete - INIT_DEPS_COMPLETE sentinel missing." -Color $Colors.Error
        Write-Log "Remote output:" -Color $Colors.Error
        Write-Log $result -Color $Colors.Error
        return $false
    }
    catch {
        Write-Log "Initial setup failed: $_" -Color $Colors.Error
        return $false
    }
}

function Setup-BackendEnvironment {
    Write-Log "Setting up backend environment..." -Color $Colors.Info

    try {
        $setupScript = @"
set -e
cd $VpsPath

# Create backend .env if it doesn't exist
if [ ! -f backend/.env ]; then
    JWT_SECRET=`$(openssl rand -base64 32)
    echo "NODE_ENV=production" > backend/.env
    echo "BACKEND_PORT=$BackendPort" >> backend/.env
    echo "DATABASE_URL=postgresql://${DbUser}:${DbPassword}@localhost:5432/${DbName}" >> backend/.env
    echo "JWT_SECRET=`${JWT_SECRET}" >> backend/.env
    echo "JWT_EXPIRES_IN=7d" >> backend/.env
    echo "CORS_ORIGIN=https://$VpsDomain" >> backend/.env
    echo "" >> backend/.env
    echo "SMTP_HOST=smtp.emailit.com" >> backend/.env
    echo "SMTP_PORT=587" >> backend/.env
    echo "SMTP_USER=emailit" >> backend/.env
    echo "SMTP_PASS=secret_MVseUMO7WC0OLrvQqK2poXdjKU986HWg" >> backend/.env
    echo "SMTP_FROM=info@$VpsDomain" >> backend/.env
    echo "" >> backend/.env
    echo "TIDYCAL_CLIENT_ID=${TIDYCAL_CLIENT_ID}" >> backend/.env
    echo "TIDYCAL_CLIENT_SECRET=${TIDYCAL_CLIENT_SECRET}" >> backend/.env
    echo "TIDYCAL_REDIRECT_URI=https://$VpsDomain/api/v1/calendar/oauth/callback" >> backend/.env
    echo "Created new backend/.env file"
else
    echo "backend/.env already exists - preserving configuration"
fi

# Install workspace dependencies
echo "Installing pnpm workspace dependencies..."
cd $VpsPath
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Build shared package first (clear stale cache)
echo "Building shared package..."
rm -f packages/shared/tsconfig.tsbuildinfo
pnpm --filter @arafat/shared build

# Build backend
echo "Building backend..."
cd $VpsPath/backend
pnpm build

# Create tables via synchronize (harmless if tables exist)
echo "Ensuring database tables..."
sed -i 's/synchronize: false/synchronize: true/' dist/src/app.module.js
timeout 15 node dist/src/main.js 2>&1 || true
sed -i 's/synchronize: true/synchronize: false/' dist/src/app.module.js

echo "BACKEND_ENV_COMPLETE"
"@

        $result = Invoke-VpsScript -Script $setupScript

        if ($result -match "BACKEND_ENV_COMPLETE") {
            Write-Log "Backend environment configured" -Color $Colors.Success
            return $true
        }

        Write-Log "Backend env setup did not complete - BACKEND_ENV_COMPLETE sentinel missing." -Color $Colors.Error
        Write-Log "Remote output:" -Color $Colors.Error
        Write-Log $result -Color $Colors.Error
        return $false
    }
    catch {
        Write-Log "Backend environment setup failed: $_" -Color $Colors.Error
        return $false
    }
}

function Seed-Database {
    Write-Log "Seeding database..." -Color $Colors.Info

    try {
        $seedScript = @"
set -e
cd $VpsPath/backend
export `$(grep -v '^#' .env | grep -v '^$' | xargs) 2>/dev/null || true
npx ts-node src/db/seeds/run-seed.ts
echo "SEED_COMPLETE"
"@

        $result = Invoke-VpsScript -Script $seedScript

        if ($result -match "SEED_COMPLETE") {
            Write-Log "Database seeded successfully" -Color $Colors.Success
            return $true
        }

        Write-Log "Database seed did not complete - SEED_COMPLETE sentinel missing." -Color $Colors.Error
        Write-Log "Remote output:" -Color $Colors.Error
        Write-Log $result -Color $Colors.Error
        return $false
    }
    catch {
        Write-Log "Database seeding failed: $_" -Color $Colors.Error
        return $false
    }
}

function Configure-Nginx {
    Write-Log "Configuring Nginx..." -Color $Colors.Info

    try {
        # Check if SSL cert exists on VPS
        $hasSsl = Invoke-VpsCommand -Command "test -f /etc/letsencrypt/live/$VpsDomain/fullchain.pem && echo YES || echo NO" -ReturnOutput -Silent
        $hasSsl = $hasSsl -match "YES"

        if ($hasSsl) {
            Write-Log "SSL certificate found, configuring HTTPS..." -Color $Colors.Info
            $nginxConfig = @"
server {
    listen 80;
    listen [::]:80;
    server_name $VpsDomain www.$VpsDomain;
    return 301 https://$VpsDomain`$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.$VpsDomain;

    ssl_certificate /etc/letsencrypt/live/$VpsDomain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$VpsDomain/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://$VpsDomain`$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $VpsDomain;

    ssl_certificate /etc/letsencrypt/live/$VpsDomain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$VpsDomain/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    root $VpsPath/frontend;
    index index.html;

    location / {
        try_files `$uri `$uri/ /index.html;
    }

    location /api/v1/ {
        proxy_pass http://127.0.0.1:$BackendPort/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api/docs {
        proxy_pass http://127.0.0.1:$BackendPort/api/docs;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:$BackendPort/uploads/;
    }
}
"@
        } else {
            Write-Log "No SSL certificate yet, configuring HTTP-only..." -Color $Colors.Warning
            $nginxConfig = @"
server {
    listen 80;
    listen [::]:80;
    server_name $VpsDomain www.$VpsDomain;

    client_max_body_size 10M;

    root $VpsPath/frontend;
    index index.html;

    location / {
        try_files `$uri `$uri/ /index.html;
    }

    location /api/v1/ {
        proxy_pass http://127.0.0.1:$BackendPort/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api/docs {
        proxy_pass http://127.0.0.1:$BackendPort/api/docs;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:$BackendPort/uploads/;
    }
}
"@
        }

        $nginxScript = @"
cat > /etc/nginx/sites-available/arafatcrm << 'NGINXEOF'
$nginxConfig
NGINXEOF

ln -sf /etc/nginx/sites-available/arafatcrm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "NGINX_CONFIGURED"
"@

        $result = Invoke-VpsScript -Script $nginxScript

        if ($result -match "NGINX_CONFIGURED") {
            Write-Log "Nginx configured successfully" -Color $Colors.Success
            return $true
        }

        Write-Log "Nginx configuration did not complete - NGINX_CONFIGURED sentinel missing." -Color $Colors.Error
        Write-Log "Remote output:" -Color $Colors.Error
        Write-Log $result -Color $Colors.Error
        return $false
    }
    catch {
        Write-Log "Nginx configuration failed: $_" -Color $Colors.Error
        return $false
    }
}

function Start-Pm2Process {
    param([switch]$Restart)

    $action = if ($Restart) { "Restarting" } else { "Starting" }
    Write-Log "$action PM2 process..." -Color $Colors.Info

    try {
        $pm2Script = @"
set -e
cd $VpsPath/backend

if [ "$Restart" = "true" ]; then
    pm2 restart arafatcrm-api 2>/dev/null || pm2 start dist/src/main.js --name arafatcrm-api
else
    pm2 delete arafatcrm-api 2>/dev/null || true
    pm2 start dist/src/main.js --name arafatcrm-api
fi

pm2 save
pm2 startup 2>/dev/null || true
echo "PM2_STARTED"
"@

        $result = Invoke-VpsScript -Script $pm2Script

        if ($result -match "PM2_STARTED") {
            Write-Log "PM2 process started successfully" -Color $Colors.Success
            return $true
        }

        Write-Log "PM2 start did not complete - PM2_STARTED sentinel missing." -Color $Colors.Error
        Write-Log "Remote output:" -Color $Colors.Error
        Write-Log $result -Color $Colors.Error
        return $false
    }
    catch {
        Write-Log "PM2 start failed: $_" -Color $Colors.Error
        return $false
    }
}

function Update-Backend {
    Write-Log "========================================" -Color $Colors.Step
    Write-Log "Updating Backend" -Color $Colors.Step
    Write-Log "========================================" -Color $Colors.Step

    try {
        $updateScript = @"
set -e
cd $VpsPath

# Install/update workspace dependencies
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Build shared package (clear tsbuildinfo cache first)
rm -f packages/shared/tsconfig.tsbuildinfo
pnpm --filter @arafat/shared build

# Build backend
cd backend
pnpm build

# Run pending TypeORM migrations against compiled dist/ (CLAUDE.md note 23:
# never use the TypeORM CLI on the VPS — it forks a recursive Node process).
echo "Running database migrations..."
node scripts/run-migrations-prod.js

# Restart PM2 process
pm2 restart arafatcrm-api 2>/dev/null || pm2 start dist/src/main.js --name arafatcrm-api
pm2 save

echo "UPDATE_COMPLETE"
"@

        $result = Invoke-VpsScript -Script $updateScript

        if ($result -match "UPDATE_COMPLETE") {
            Write-Log "Backend updated successfully" -Color $Colors.Success
            return $true
        }

        Write-Log "Backend update did not complete - UPDATE_COMPLETE sentinel missing." -Color $Colors.Error
        Write-Log "Remote output:" -Color $Colors.Error
        Write-Log $result -Color $Colors.Error
        return $false
    }
    catch {
        Write-Log "Backend update failed: $_" -Color $Colors.Error
        return $false
    }
}

#endregion

#region Testing Functions

function Test-FrontendHealth {
    Write-Log "Testing frontend endpoint..." -Color $Colors.Info

    try {
        $testUrl = "https://$VpsDomain/"
        $response = Invoke-WebRequest -Uri $testUrl -Method Get -TimeoutSec 30 -UseBasicParsing

        if ($response.StatusCode -eq 200) {
            Write-Log "Frontend health check PASSED" -Color $Colors.Success
            return $true
        } else {
            Write-Log "Frontend returned status code: $($response.StatusCode)" -Color $Colors.Warning
            return $false
        }
    }
    catch {
        Write-Log "Frontend health check FAILED: $_" -Color $Colors.Warning
        Write-Log "  This may be due to SSL certificate or DNS issues" -Color $Colors.Info
        return $false
    }
}

function Test-BackendHealth {
    Write-Log "Testing backend API endpoint..." -Color $Colors.Info

    try {
        $internalCheck = Invoke-VpsCommand -Command "curl -s -o /dev/null -w '%{http_code}' http://localhost:$BackendPort/api/v1/auth/login" -ReturnOutput -Silent

        if ($internalCheck -match "200|401|400") {
            Write-Log "Backend health check PASSED (internal - HTTP $internalCheck)" -Color $Colors.Success
            return $true
        }

        $testUrl = "https://$VpsDomain/api/v1/auth/login"
        $response = Invoke-WebRequest -Uri $testUrl -Method Get -TimeoutSec 30 -UseBasicParsing

        if ($response.StatusCode -in @(200, 401, 400)) {
            Write-Log "Backend health check PASSED" -Color $Colors.Success
            return $true
        } else {
            Write-Log "Backend returned status code: $($response.StatusCode)" -Color $Colors.Warning
            return $false
        }
    }
    catch {
        Write-Log "Backend health check FAILED: $_" -Color $Colors.Warning
        return $false
    }
}

function Test-Pm2Status {
    Write-Log "Checking PM2 process status..." -Color $Colors.Info

    try {
        $status = Invoke-VpsCommand -Command "pm2 jlist" -ReturnOutput -Silent

        if ($status -match "arafatcrm-api" -and $status -match '"status":"online"') {
            Write-Log "PM2 process is running" -Color $Colors.Success
            return $true
        } else {
            Write-Log "PM2 process may not be running properly" -Color $Colors.Warning
            $pm2Status = Invoke-VpsCommand -Command "pm2 status" -ReturnOutput -Silent
            Write-Log "PM2 Status: $pm2Status" -Color $Colors.Info
            return $false
        }
    }
    catch {
        Write-Log "PM2 status check failed: $_" -Color $Colors.Warning
        return $false
    }
}

#endregion

#region Main Deployment Function

function Start-Deployment {
    Write-Log "========================================" -Color $Colors.Step
    Write-Log "ArafatCRM - Real Estate CRM"
    Write-Log "VPS Deployment Script" -Color $Colors.Step
    Write-Log "========================================" -Color $Colors.Step
    Write-Log "VPS Host: $VpsHost" -Color $Colors.Info
    Write-Log "VPS User: $VpsUser" -Color $Colors.Info
    Write-Log "VPS Path: $VpsPath" -Color $Colors.Info
    Write-Log "Domain: $VpsDomain" -Color $Colors.Info
    Write-Log "Backend Port: $BackendPort" -Color $Colors.Info
    Write-Log "Init Mode: $Init" -Color $Colors.Info
    Write-Log "Skip Frontend: $SkipFrontend" -Color $Colors.Info
    Write-Log "Skip Backend: $SkipBackend" -Color $Colors.Info
    Write-Log ""

    # Validate prerequisites
    if (-not (Test-Prerequisites)) {
        Write-Log "Prerequisites validation failed. Exiting." -Color $Colors.Error
        exit 1
    }
    Write-Log ""

    # Test SSH connection
    if (-not (Test-SshConnection)) {
        Write-Log "Cannot establish SSH connection to VPS." -Color $Colors.Error
        Write-Log "Please ensure:" -Color $Colors.Info
        Write-Log "1. VPS is accessible and SSH service is running" -Color $Colors.Info
        Write-Log "2. Firewall allows SSH connections (port 22)" -Color $Colors.Info
        Write-Log "3. Credentials are correct" -Color $Colors.Info
        Write-Log ""
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            exit 1
        }
    }
    Write-Log ""

    # Track deployment results
    $results = @{
        Frontend = $null
        Backend = $null
    }

    # Initial setup mode
    if ($Init) {
        Write-Log "Running initial VPS setup..." -Color $Colors.Step

        if (-not (Initialize-VpsEnvironment)) {
            Write-Log "Initial environment setup failed. Exiting." -Color $Colors.Error
            exit 1
        }
    }

    # Build and deploy frontend
    if (-not $SkipFrontend) {
        if (Build-Frontend) {
            $results.Frontend = Deploy-Frontend
        } else {
            $results.Frontend = $false
        }
    } else {
        Write-Log "Skipping frontend deployment" -Color $Colors.Info
        $results.Frontend = $true
    }

    # Deploy backend
    if (-not $SkipBackend) {
        $results.Backend = Deploy-Backend

        if ($results.Backend) {
            # Track each step so the summary reflects actual remote success,
            # not just the file-transfer step.
            if ($Init) {
                $envOk    = Setup-BackendEnvironment
                $seedOk   = if ($envOk) { Seed-Database } else { $false }
                $nginxOk  = Configure-Nginx
                $pm2Ok    = Start-Pm2Process
                $results.Backend = $envOk -and $seedOk -and $nginxOk -and $pm2Ok
            } else {
                $updateOk = Update-Backend
                $nginxOk  = Configure-Nginx
                $results.Backend = $updateOk -and $nginxOk
            }
        }
    } else {
        Write-Log "Skipping backend deployment" -Color $Colors.Info
        $results.Backend = $true
    }

    # Verification
    if (-not $SkipTests) {
        Write-Log ""
        Write-Log "========================================" -Color $Colors.Step
        Write-Log "Verifying Deployment" -Color $Colors.Step
        Write-Log "========================================" -Color $Colors.Step

        Start-Sleep -Seconds 5

        Test-Pm2Status | Out-Null
        Test-BackendHealth | Out-Null
        Test-FrontendHealth | Out-Null
    }

    # Summary
    Write-Log ""
    Write-Log "========================================" -Color $Colors.Step
    Write-Log "Deployment Summary" -Color $Colors.Step
    Write-Log "========================================" -Color $Colors.Step
    Write-Log "VPS: $VpsHost" -Color $Colors.Info
    Write-Log "Domain: https://$VpsDomain" -Color $Colors.Info
    Write-Log "API Docs: https://$VpsDomain/api/docs" -Color $Colors.Info
    Write-Log ""
    Write-Log "Frontend: $(if ($results.Frontend) { 'SUCCESS' } else { 'FAILED' })" -Color $(if ($results.Frontend) { $Colors.Success } else { $Colors.Error })
    Write-Log "Backend: $(if ($results.Backend) { 'SUCCESS' } else { 'FAILED' })" -Color $(if ($results.Backend) { $Colors.Success } else { $Colors.Error })
    Write-Log ""

    if ($Init) {
        Write-Log "Run 'pnpm --filter backend seed' on VPS to seed demo data" -Color $Colors.Info
        Write-Log ""
    }

    if ($results.Frontend -and $results.Backend) {
        Write-Log "Deployment completed successfully!" -Color $Colors.Success
        exit 0
    } else {
        Write-Log "Deployment completed with errors" -Color $Colors.Error
        exit 1
    }
}

#endregion

# Run deployment
Start-Deployment
