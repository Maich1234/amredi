import React, { useState } from "react";
import { Image, View, Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { db } from "../backend";
import { useSession } from "../session";
import { useTheme } from "../theme";
import { Copy } from "../ui";
export async function choosePhoto(avatar = false) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: avatar ? [1, 1] : [4, 3],
    quality: 1,
    exif: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.width * asset.height > 50000000)
    throw new Error("Choose a smaller photo (under 50 megapixels).");
  const context = ImageManipulator.manipulate(asset.uri);
  const edge = avatar ? 512 : 1440;
  context.resize(
    asset.width >= asset.height
      ? { width: Math.min(edge, asset.width) }
      : { height: Math.min(edge, asset.height) },
  );
  const image = await context.renderAsync();
  try {
    return (await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.78 }))
      .uri;
  } finally {
    context.release();
    image.release();
  }
}
export async function uploadPhoto(
  uri: string,
  user: string,
  kind: "avatar" | "post",
) {
  const bytes =
    Platform.OS === "web"
      ? await (await fetch(uri)).arrayBuffer()
      : await new File(uri).arrayBuffer();
  if (bytes.byteLength > 2097152)
    throw new Error("This photo is too large. Please choose a smaller one.");
  const path = `${user}/${kind}-${randomUUID()}.jpg`;
  const { error } = await db()
    .storage.from("community")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (error)
    throw new Error(
      "Photo upload failed. Check your connection and try again.",
    );
  return path;
}
export function PrivateImage({
  path,
  label,
  size = 44,
  avatar = false,
}: {
  path: string | null;
  label: string;
  size?: number;
  avatar?: boolean;
}) {
  const { session } = useSession();
  const { colors } = useTheme();
  const [failed, setFailed] = useState<string | null>(null);
  const signed = useQuery({
    queryKey: ["community", "image", session?.user.id, path],
    enabled: !!path && !!session,
    staleTime: 60000,
    refetchInterval: 90000,
    queryFn: async () => {
      const { data, error } = await db()
        .storage.from("community")
        .createSignedUrl(path!, 120);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  const style = avatar
    ? { width: size, height: size, borderRadius: size / 2 }
    : { width: "100%" as const, aspectRatio: 4 / 3, borderRadius: 16 };
  if (signed.data && failed !== signed.data)
    return (
      <Image
        accessibilityLabel={label}
        source={{ uri: signed.data }}
        style={style}
        onError={() => setFailed(signed.data!)}
      />
    );
  return (
    <View
      style={[
        style,
        {
          backgroundColor: colors.soft,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <Copy strong size={avatar ? size / 3 : 14}>
        {avatar
          ? label.trim().slice(0, 1).toUpperCase() || "A"
          : signed.isError || failed
            ? "Photo unavailable"
            : "Loading photo…"}
      </Copy>
    </View>
  );
}
