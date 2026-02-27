#!/usr/bin/env bash
set -euo pipefail

# Build APK for Aux Android app
# Usage: ./scripts/build-apk.sh [debug|release]

BUILD_TYPE="${1:-debug}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"

# Android SDK
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

if [ ! -d "$ANDROID_HOME" ]; then
  echo "Error: Android SDK not found at $ANDROID_HOME"
  echo "Set ANDROID_HOME to your SDK path"
  exit 1
fi

# Sync Capacitor
echo "=> Syncing Capacitor..."
cd "$PROJECT_ROOT"
npx cap sync android

# Build with Gradle
echo "=> Building $BUILD_TYPE APK..."
cd "$ANDROID_DIR"

if [ "$BUILD_TYPE" = "release" ]; then
  ./gradlew assembleRelease --no-daemon
  APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release-unsigned.apk"
else
  ./gradlew assembleDebug --no-daemon
  APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
fi

if [ -f "$APK_PATH" ]; then
  SIZE=$(du -h "$APK_PATH" | cut -f1)
  echo ""
  echo "APK built successfully ($SIZE):"
  echo "  $APK_PATH"

  if [ "$BUILD_TYPE" = "debug" ]; then
    echo ""
    echo "Install on connected device:"
    echo "  adb install $APK_PATH"
  else
    echo ""
    echo "Note: Release APK is unsigned. Sign it before publishing:"
    echo "  apksigner sign --ks your-key.keystore $APK_PATH"
  fi
else
  echo "Error: APK not found at expected path"
  exit 1
fi
