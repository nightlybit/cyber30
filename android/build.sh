#!/usr/bin/env bash
# Builds Cyber30.apk without Gradle: aapt2 -> javac -> d8 -> zipalign -> apksigner.
# Needs: JDK 17+, Android SDK at $ANDROID_HOME (default ~/Android) with platforms;android-35 and build-tools;35.0.0.
#
# The APK is a PERSONAL build: it contains your server address and access key so it can sync
# with your Kali machine. Don't share it. Override the address with: SERVER=http://IP:8730 ./build.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
ROOT=..
SDK="${ANDROID_HOME:-$HOME/Android}"
BT="$SDK/build-tools/35.0.0"
JAR="$SDK/platforms/android-35/android.jar"
OUT=build
KS="$HOME/.cyber30/release.jks"
KSPASS="$HOME/.cyber30/keystore.pass"

rm -rf "$OUT" && mkdir -p "$OUT"/{assets/content,classes,gen,dex}
cp -r "$ROOT/web" "$OUT/assets/web"
cp -r "$ROOT/content/days" "$OUT/assets/content/days"
SERVER="${SERVER:-http://$(hostname -I | awk '{print $1}'):8730}"
KEY="$(cat "$ROOT/data/access_key.txt")"
printf '{"server":"%s","key":"%s"}' "$SERVER" "$KEY" > "$OUT/assets/config.json"
VERSION="$(date +%Y%m%d)"

echo "[1/5] resources"
"$BT/aapt2" compile --dir res -o "$OUT/res.zip"
"$BT/aapt2" link -I "$JAR" --manifest AndroidManifest.xml -A "$OUT/assets" -o "$OUT/base.apk" \
  --java "$OUT/gen" --min-sdk-version 26 --target-sdk-version 34 \
  --version-code "${VERSION:2}" --version-name "1.0.$VERSION" "$OUT/res.zip"

echo "[2/5] compile java"
javac -nowarn --release 17 -cp "$JAR" -d "$OUT/classes" $(find src "$OUT/gen" -name '*.java')

echo "[3/5] dex"
"$BT/d8" --release --min-api 26 --lib "$JAR" --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q ../unsigned.apk classes.dex)

echo "[4/5] align"
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

echo "[5/5] sign"
if [ ! -f "$KS" ]; then  # one signing key, kept outside the repo; keep it to install future updates over this one
  mkdir -p "$(dirname "$KS")" && chmod 700 "$(dirname "$KS")"
  head -c 24 /dev/urandom | base64 | tr -d '/+=' > "$KSPASS" && chmod 600 "$KSPASS"
  keytool -genkeypair -keystore "$KS" -alias cyber30 -keyalg RSA -keysize 3072 -validity 10000 \
    -storepass:file "$KSPASS" -keypass:file "$KSPASS" -dname "CN=Cyber30" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$KS" --ks-pass "file:$KSPASS" --out "$ROOT/Cyber30.apk" "$OUT/aligned.apk"
"$BT/apksigner" verify "$ROOT/Cyber30.apk"
echo "Built $(cd "$ROOT" && pwd)/Cyber30.apk  (syncs with $SERVER)"
