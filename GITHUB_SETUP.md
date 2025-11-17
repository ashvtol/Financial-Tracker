# GitHub Repository Setup Instructions

## Quick Setup (Copy & Paste)

Follow these steps to create and connect your GitHub repository:

### Step 1: Create Repository on GitHub

1. Go to: https://github.com/new
2. Fill in:
   - **Repository name**: `Financial-Tracker`
   - **Description**: `Advanced Financial Tracker with AI-powered categorization and multi-user support`
   - **Visibility**: Choose Public or Private
   - **Do NOT** initialize with README, .gitignore, or license (we already have these)
3. Click "Create repository"

### Step 2: Connect and Push

After creating the repository, GitHub will show you commands. Use these instead:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/Financial-Tracker.git

# Verify the remote was added
git remote -v

# Push your code
git push -u origin main
```

### Step 3: Verify

Visit your repository at: `https://github.com/YOUR_USERNAME/Financial-Tracker`

---

## Alternative: Use GitHub CLI (Recommended for Future)

If you want to install GitHub CLI for easier repo management:

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install GitHub CLI
brew install gh

# Authenticate
gh auth login

# Create and push repository (for future projects)
gh repo create Financial-Tracker --public --source=. --remote=origin --push
```

---

## Current Status

✅ Git repository initialized
✅ Initial commit created
✅ .gitignore configured
⏳ Waiting for GitHub remote setup

Once you complete the steps above, you'll be ready to use the checkpoint system!
