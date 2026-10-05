#!/usr/bin/env bash
# Builds the Windchill Mastery APK from the static website in apps/web/out.
# Uses plain SDK tools (aapt, javac, dx, zipalign, apksigner), so no Gradle download is needed.
# Ubuntu/Debian: sudo apt install android-sdk android-sdk-platform-23 openjdk-17-jdk-headless
set -euo pipefail
unset JAVA_TOOL_OPTIONS  # keeps tool output readable; no network is used

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
WEB_OUT="$ROOT/apps/web/out"
BUILD="$HERE/build"
SDK="${ANDROID_SDK:-/usr/lib/android-sdk}"
PLATFORM_JAR="${ANDROID_JAR:-$SDK/platforms/android-23/android.jar}"
KEYSTORE="${KEYSTORE:-$HOME/.android/windchill-mastery.jks}"
KEY_ALIAS="${KEY_ALIAS:-windchill}"
KEY_PASS="${KEY_PASS:-windchill}"
VERSION_NAME="$(node -p "require('$ROOT/package.json').version")"
# 1.2.3 -> 10203
VERSION_CODE="$(node -p "'$VERSION_NAME'.split('.').reduce((a, n) => a * 100 + Number(n), 0)")"
DEX="$(command -v d8 || command -v dalvik-exchange || echo "$SDK/build-tools/29.0.3/dx")"

[ -f "$WEB_OUT/index.html" ] || { echo "No website build found. Run: npm run build:web" >&2; exit 1; }
[ -f "$PLATFORM_JAR" ] || { echo "Missing $PLATFORM_JAR (install android-sdk-platform-23 or set ANDROID_JAR)" >&2; exit 1; }

rm -rf "$BUILD" && mkdir -p "$BUILD/gen" "$BUILD/classes" "$BUILD/assets"
echo "→ Bundling website ($(du -sh "$WEB_OUT" | cut -f1))"
cp -r "$WEB_OUT" "$BUILD/assets/www"
rm -f "$BUILD/assets/www/sw.js"

echo "→ Generating R.java"
aapt package -f -m -J "$BUILD/gen" -M "$HERE/AndroidManifest.xml" -S "$HERE/res" -I "$PLATFORM_JAR"

echo "→ Compiling Java"
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 \
  -bootclasspath "$PLATFORM_JAR" -d "$BUILD/classes" \
  $(find "$HERE/src" "$BUILD/gen" -name '*.java')

echo "→ Dexing"
case "$DEX" in
  *d8) "$DEX" --min-api 24 --lib "$PLATFORM_JAR" --output "$BUILD" $(find "$BUILD/classes" -name '*.class') ;;
  *) "$DEX" --dex --min-sdk-version=24 --output="$BUILD/classes.dex" "$BUILD/classes" ;;
esac

echo "→ Packaging $VERSION_NAME ($VERSION_CODE)"
aapt package -f -M "$HERE/AndroidManifest.xml" -S "$HERE/res" -A "$BUILD/assets" -I "$PLATFORM_JAR" \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -0 woff2 -0 png -0 pdf -0 webp -0 jpg \
  --ignore-assets '!.svn:!.git:!.DS_Store:!*~' \
  -F "$BUILD/unsigned.apk"
(cd "$BUILD" && aapt add -f unsigned.apk classes.dex >/dev/null)
zipalign -f -p 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"

if [ ! -f "$KEYSTORE" ]; then
  echo "→ Creating signing key at $KEYSTORE (keep it: updates must be signed with the same key)"
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -keystore "$KEYSTORE" -alias "$KEY_ALIAS" -storepass "$KEY_PASS" -keypass "$KEY_PASS" \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Windchill Mastery" >/dev/null 2>&1
fi
OUT="$BUILD/windchill-mastery-$VERSION_NAME.apk"
apksigner sign --ks "$KEYSTORE" --ks-key-alias "$KEY_ALIAS" --ks-pass "pass:$KEY_PASS" --key-pass "pass:$KEY_PASS" \
  --min-sdk-version 24 --out "$OUT" "$BUILD/aligned.apk"
apksigner verify "$OUT"
echo "✓ $OUT ($(du -h "$OUT" | cut -f1))"
