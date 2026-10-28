// APK variants keep emulator ABIs out of phone-only test downloads.
module.exports = ({ config }) => {
  const variant = process.env.AMREDI_APK_VARIANT || "universal";
  const architectures = {
    universal: ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"],
    phone: ["armeabi-v7a", "arm64-v8a"],
    arm64: ["arm64-v8a"],
  };
  if (!Object.hasOwn(architectures, variant)) {
    throw new Error("AMREDI_APK_VARIANT must be universal, phone or arm64.");
  }
  return {
    ...config,
    jsEngine: "hermes",
    plugins: [
      ...(config.plugins || []).filter(
        (plugin) =>
          (Array.isArray(plugin) ? plugin[0] : plugin) !==
            "expo-build-properties" &&
          (Array.isArray(plugin) ? plugin[0] : plugin) !== "expo-image-picker",
      ),
      [
        "expo-image-picker",
        {
          photosPermission: "Choose a photo for your Amredi profile or post.",
          cameraPermission: false,
          microphonePermission: false,
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            buildArchs: architectures[variant],
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            enableBundleCompression: true,
            useLegacyPackaging: false,
          },
        },
      ],
    ],
  };
};
