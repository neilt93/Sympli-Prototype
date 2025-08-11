# Start Frontend Script
Write-Host "🚀 Starting Sympli Health Frontend..." -ForegroundColor Green

# Check if we're in the right directory
if (Test-Path "package.json") {
    Write-Host "✅ Found package.json - Starting Next.js development server..." -ForegroundColor Green
    npm run dev
} else {
    Write-Host "❌ package.json not found. Please run this script from the project root directory." -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
}

