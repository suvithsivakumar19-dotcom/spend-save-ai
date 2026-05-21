Param(
  [string]$Username = "Suvith10",
  [string]$RepoName = "SpendSaveAI",
  [ValidateSet('public','private')][string]$Visibility = "public",
  [string]$CommitMessage = "Initial commit — prepare for Netlify deploy: add domains page + netlify config"
)

if (-not $env:GITHUB_TOKEN) {
  Write-Error "GITHUB_TOKEN environment variable is not set. Create a Personal Access Token with 'repo' scope and set it: `$env:GITHUB_TOKEN = 'ghp_...'."
  exit 1
}

Push-Location -Path (Get-Location)

# Initialize git if necessary
try {
  git rev-parse --is-inside-work-tree > $null 2>&1
  $isRepo = ($LASTEXITCODE -eq 0)
} catch {
  $isRepo = $false
}

if (-not $isRepo) {
  git init
  git branch -M main
}

# Add and commit changes (skip if no changes)
git add -A
$status = git status --porcelain
if ($status) {
  git commit -m $CommitMessage
} else {
  Write-Output "No changes to commit."
}

# Create repo via GitHub API (ignore if already exists)
$body = @{ name = $RepoName; private = ($Visibility -eq 'private') } | ConvertTo-Json
try {
  Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers @{ Authorization = "token $env:GITHUB_TOKEN"; 'User-Agent' = 'push-script' } -Body $body -ErrorAction Stop
  Write-Output "Created repo $Username/$RepoName"
} catch {
  if ($_.Exception.Response.StatusCode.Value__ -eq 422) {
    Write-Output "Repository may already exist. Continuing..."
  } else {
    Write-Warning "API create failed: $($_.Exception.Message)"
  }
}

# Add remote and push using token-authenticated URL
$remote = "https://github.com/$Username/$RepoName.git"
try { git remote remove origin } catch {}
git remote add origin $remote

$pushUrl = "https://$($env:GITHUB_TOKEN)@github.com/$Username/$RepoName.git"

Write-Output "Pushing to https://github.com/$Username/$RepoName (this uses your local GITHUB_TOKEN for auth)..."
git push $pushUrl main -u

# Reset remote to remove token from config
git remote set-url origin $remote

Write-Output "Push complete. Repository: https://github.com/$Username/$RepoName"

Pop-Location
