import React, { useState } from "react";
import { View, Pressable } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "../backend";
import { useSession } from "../session";
import { useTheme } from "../theme";
import { Copy, s } from "../ui";
import { PrivateImage } from "./media";
import { Post, friendlyError } from "./data";
export function Action({
  icon,
  label,
  active,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        minWidth: 48,
        paddingHorizontal: 8,
        gap: 6,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed || disabled ? 0.5 : 1,
      })}
    >
      <MaterialCommunityIcons
        name={icon}
        size={23}
        color={active ? colors.pink : colors.muted}
      />
      <Copy size={13}>{label}</Copy>
    </Pressable>
  );
}
export function PostCard({
  post,
  detail = false,
}: {
  post: Post;
  detail?: boolean;
}) {
  const { colors } = useTheme();
  const { session } = useSession();
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const mutate = useMutation({
    mutationFn: async (kind: "like" | "save") => {
      const table = kind === "like" ? "community_likes" : "community_saves";
      const active = kind === "like" ? post.liked : post.saved;
      const result = active
        ? await db()
            .from(table)
            .delete()
            .eq("post_id", post.id)
            .eq("user_id", session!.user.id)
        : await db()
            .from(table)
            .upsert(
              { post_id: post.id, user_id: session!.user.id },
              { onConflict: "post_id,user_id", ignoreDuplicates: true },
            );
      if (result.error) throw result.error;
    },
    onMutate: () => setError(""),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["community"] }),
    onError: (e) => setError(friendlyError(e)),
  });
  const author = post.community_profiles;
  return (
    <View
      style={{
        padding: 16,
        gap: 12,
        backgroundColor: colors.surface,
        borderColor: colors.line,
        borderWidth: 1,
        borderRadius: 22,
      }}
    >
      <View style={s.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${author?.display_name ?? "member"} profile`}
          onPress={() =>
            router.push({
              pathname: "/community/member",
              params: { id: post.author_id },
            })
          }
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
          }}
        >
          <PrivateImage
            avatar
            path={author?.avatar_path ?? null}
            label={author?.display_name ?? "Member"}
          />
          <View style={{ flex: 1 }}>
            <Copy strong size={15}>
              {author?.display_name ?? "Community member"}
            </Copy>
            <Copy muted size={12}>
              {new Date(post.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}{" "}
              · Community
            </Copy>
          </View>
        </Pressable>
        <Action
          icon="dots-horizontal"
          label="Options"
          onPress={() =>
            router.push({
              pathname: "/community/options",
              params: { post: post.id, author: post.author_id },
            })
          }
        />
      </View>
      <Copy>{post.body}</Copy>
      {!!post.image_path && (
        <PrivateImage
          path={post.image_path}
          label={post.image_alt || "Community post photo"}
        />
      )}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.line,
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <Action
          icon={post.liked ? "heart" : "heart-outline"}
          label={`${post.community_likes[0]?.count ?? 0} likes`}
          active={post.liked}
          disabled={mutate.isPending}
          onPress={() => mutate.mutate("like")}
        />
        {!detail && (
          <Action
            icon="comment-outline"
            label={`${post.community_comments[0]?.count ?? 0} comments`}
            onPress={() =>
              router.push({ pathname: "/post/[id]", params: { id: post.id } })
            }
          />
        )}
        <Action
          icon={post.saved ? "bookmark" : "bookmark-outline"}
          label={post.saved ? "Saved" : "Save"}
          active={post.saved}
          disabled={mutate.isPending}
          onPress={() => mutate.mutate("save")}
        />
      </View>
      {!!error && <Copy size={13}>{error}</Copy>}
    </View>
  );
}
