#!/bin/bash
set -e

echo "🔧 Starting build process..."

# Build the app
cd ios
xcodebuild -workspace BuzyBees.xcworkspace \
  -scheme BuzyBees \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  build

echo "✅ Build completed"

# Install and launch
cd ..
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "BuzyBees.app" -type d | head -1)
if [ -n "$APP_PATH" ]; then
  echo "📱 Installing app..."
  xcrun simctl install booted "$APP_PATH"
  echo "🚀 Launching app..."
  xcrun simctl launch booted org.app.qwiken
  echo "✅ App launched successfully!"
else
  echo "❌ App not found in build products"
fi
