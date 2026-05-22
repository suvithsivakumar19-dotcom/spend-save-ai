Push this project to GitHub automatically

Prerequisites

- PowerShell (Windows) or pwsh
- A GitHub Personal Access Token with `repo` scope set in the environment variable `GITHUB_TOKEN`.

Usage

1. Open PowerShell in the project root.
2. Set your token (example):
   ```powershell
   $env:GITHUB_TOKEN = 'ghp_xxx'
   ```
3. Run the script:
   ```powershell
   .\scripts\push_to_github.ps1 -Username Suvith10 -RepoName SpendSaveAI -Visibility public
   ```

The script will initialize git if needed, create the repo via the GitHub API (if it doesn't exist), and push the `main` branch.
