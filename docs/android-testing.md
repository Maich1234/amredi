# Optimized Android testing build

## Prepared build

EAS project: https://expo.dev/accounts/maich123/projects/amredi
Project ID: 42ace0f2-5bc6-42fa-8b20-bce0948c78b8
Package: com.amredi.app

The preview profile builds a standalone release APK with embedded production JavaScript compiled to Hermes bytecode. It does not require Expo Go or a running Metro server. Supabase features still require internet access.

Build optimization is configured through expo-build-properties, not manual generated Gradle edits:

- R8 code shrinking/minification and unused resource shrinking.
- Compressed embedded JavaScript bundle. This reduces packaged size but may add startup decompression work; device startup remains unmeasured.
- `preview`: ARM 32/64-bit phone architectures; no x86 emulator libraries.
- `preview-arm64`: smaller, restricted to ARM64 devices.
- `preview-universal`: all four standard ABIs, including x86 emulators.
- Production uses universal architecture support and an AAB by default for store-managed delivery.
- Native libraries keep modern packaging (`useLegacyPackaging=false`) to avoid forcing an additional extracted copy on-device just to reduce APK download bytes.
- Removed unused react-native-svg native dependency. ESLint configuration and Atlas analysis tooling are development dependencies.
- Launcher assets use the original mark extracted from the deck; high-resolution/vector artwork is still needed for production branding.

## Validation completed

- Lint and strict TypeScript pass.
- Android production bundle export passes.
- A clean prebuild in an isolated temporary directory confirms:
  android.enableMinifyInReleaseBuilds=true;
  android.enableShrinkResourcesInReleaseBuilds=true;
  android.enableBundleCompression=true;
  hermesEnabled=true;
  reactNativeArchitectures=armeabi-v7a,arm64-v8a;
  bundleCommand=export:embed.
- Expo SystemUI is installed so native appearance configuration is supported.
- Current standalone Hermes export: 5,416,706 bytes (5.17 MiB) before APK compression. A ZIP-deflate simulation is approximately 2.06 MiB for the bundle alone. This is an estimate, not an APK measurement.

## Build and inspect after upload authorization

From apps/mobile:

`npx eas-cli@latest build --platform android --profile preview`

After downloading the result:

`python scripts/inspect_apk.py /absolute/path/Amredi-preview.apk`

The inspector checks ZIP integrity and an embedded JS/Hermes bundle, and reports actual APK size and native library architectures. Cold start, screen interaction and installed storage must be checked on a phone. No APK or measured final APK size exists yet.

## Current build blocker

Expo authentication and project linking succeeded. Automatic approval review rejected the cloud build because exporting source/configuration to Expo EAS was not explicitly authorised. No alternate upload path was used. The prepared optimized source requires explicit upload authorisation before retrying the cloud build.
