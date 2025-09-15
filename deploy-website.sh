#!/bin/bash

echo "🚀 Deploying Qwiken Website to GitHub Pages"
echo "==========================================="

# Check if gh-pages branch exists
if git show-ref --verify --quiet refs/heads/gh-pages; then
    echo "✅ gh-pages branch exists"
else
    echo "📦 Creating gh-pages branch..."
    git checkout --orphan gh-pages
    git rm -rf .
    git checkout main
fi

# Create a temporary directory for deployment
echo "📁 Preparing deployment files..."
rm -rf .deploy-temp
mkdir -p .deploy-temp

# Copy website files
cp -r web/* .deploy-temp/
cp -r web/.* .deploy-temp/ 2>/dev/null || true

# Create a simple index redirect if needed
if [ ! -f ".deploy-temp/index.html" ]; then
    echo "❌ index.html not found in web folder!"
    exit 1
fi

# Switch to gh-pages branch
echo "🔄 Switching to gh-pages branch..."
git checkout gh-pages

# Clear old files
echo "🧹 Clearing old files..."
git rm -rf . 2>/dev/null || true

# Copy new files
echo "📋 Copying new files..."
cp -r .deploy-temp/* .
cp -r .deploy-temp/.* . 2>/dev/null || true

# Add files to git
echo "📝 Adding files to git..."
git add -A

# Commit changes
echo "💾 Committing changes..."
git commit -m "Deploy Qwiken website - $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin gh-pages

# Switch back to main branch
echo "🔄 Switching back to main branch..."
git checkout main

# Clean up
echo "🧹 Cleaning up..."
rm -rf .deploy-temp

echo ""
echo "✅ Deployment Complete!"
echo "==========================================="
echo ""
echo "🌐 Your website will be available at:"
echo "   https://[your-username].github.io/[repository-name]"
echo ""
echo "📝 To configure GitHub Pages:"
echo "   1. Go to your repository on GitHub"
echo "   2. Click Settings → Pages"
echo "   3. Under 'Source', select 'Deploy from a branch'"
echo "   4. Choose 'gh-pages' branch and '/ (root)' folder"
echo "   5. Click Save"
echo ""
echo "⏱️ Note: It may take a few minutes for the site to be live"
echo "==========================================="