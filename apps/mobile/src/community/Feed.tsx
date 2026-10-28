import React, { useState } from "react";
import { FlatList, Pressable, View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useTheme } from "../theme";
import { Copy, Button, Card, s } from "../ui";
import { useCommunityProfile, useFeed } from "./data";
import { PrivateImage } from "./media";
import { PostCard } from "./PostCard";
export function Feed({ author }: { author?: string }) {
  const { colors } = useTheme();
  const profile = useCommunityProfile(author);
  const [mode, setMode] = useState<"all" | "mine" | "saved">("all");
  const feed = useFeed(mode, author);
  return (
    <FlatList
      data={feed.data?.pages.flat() ?? []}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PostCard post={item} />}
      contentContainerStyle={[s.page, { padding: 16 }]}
      ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      refreshing={feed.isRefetching && !feed.isFetchingNextPage}
      onRefresh={() => {
        void feed.refetch();
        void profile.refetch();
      }}
      onEndReached={() => {
        if (
          feed.hasNextPage &&
          !feed.isFetchingNextPage &&
          !feed.isFetchNextPageError
        )
          void feed.fetchNextPage();
      }}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View style={{ gap: 18, marginBottom: 18 }}>
          {author ? (
            <Card>
              <PrivateImage
                avatar
                size={88}
                path={profile.data?.avatar_path ?? null}
                label={profile.data?.display_name ?? "Member"}
              />
              <Copy strong size={26}>
                {profile.data?.display_name ?? "Community member"}
              </Copy>
              <Copy>
                {profile.data?.bio || "A member of the Amredi community."}
              </Copy>
              {!!profile.data?.interests && (
                <Copy muted>{profile.data.interests}</Copy>
              )}
            </Card>
          ) : (
            <>
              <View>
                <Copy muted size={12}>
                  GROW TOGETHER
                </Copy>
                <Copy strong size={28}>
                  Your circle, your pace.
                </Copy>
                <Copy muted size={14}>
                  Small wins. Useful skills. People who care.
                </Copy>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  profile.data
                    ? "Create a post"
                    : "Create your community profile"
                }
                onPress={() =>
                  router.push(
                    profile.data
                      ? "/community/compose"
                      : "/community/edit-profile",
                  )
                }
                style={{
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "center",
                  padding: 16,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.line,
                  borderRadius: 20,
                }}
              >
                <PrivateImage
                  avatar
                  path={profile.data?.avatar_path ?? null}
                  label={profile.data?.display_name ?? "You"}
                />
                <View style={{ flex: 1 }}>
                  <Copy strong size={15}>
                    {profile.data
                      ? "What would you like to share?"
                      : "Make yourself at home"}
                  </Copy>
                  <Copy muted size={12}>
                    {profile.data
                      ? "A small win, a question or a skill…"
                      : "Set up your community profile to post"}
                  </Copy>
                </View>
                <Copy size={24}>＋</Copy>
              </Pressable>
              <View
                style={{
                  backgroundColor: colors.soft,
                  padding: 16,
                  borderRadius: 18,
                  gap: 10,
                }}
              >
                <Copy strong size={16}>
                  Make room for your next step
                </Copy>
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Button
                      secondary
                      label="Find opportunities"
                      onPress={() => router.push("/(tabs)/opportunities")}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      secondary
                      label="Get support"
                      onPress={() => router.push("/(tabs)/support")}
                    />
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(
                  [
                    ["all", "Community"],
                    ["mine", "My posts"],
                    ["saved", "Saved"],
                  ] as const
                ).map(([v, l]) => (
                  <Pressable
                    key={v}
                    accessibilityRole="button"
                    accessibilityState={{ selected: mode === v }}
                    onPress={() => setMode(v)}
                    style={{
                      minHeight: 48,
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 24,
                      backgroundColor:
                        mode === v ? colors.soft : colors.surface,
                      borderColor: mode === v ? colors.pink : colors.line,
                      borderWidth: 1,
                    }}
                  >
                    <Copy strong size={13}>
                      {l}
                    </Copy>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {profile.isError && (
            <Button
              secondary
              label="Retry profile"
              onPress={() => void profile.refetch()}
            />
          )}
        </View>
      }
      ListEmptyComponent={
        feed.isPending ? (
          <ActivityIndicator
            accessibilityLabel="Loading community"
            color={colors.pink}
          />
        ) : feed.isError ? (
          <Card>
            <Copy>We couldn’t load the community.</Copy>
            <Button label="Try again" onPress={() => void feed.refetch()} />
          </Card>
        ) : (
          <Card>
            <Copy strong size={20}>
              {mode === "saved"
                ? "Keep something for later"
                : author
                  ? "No posts to show yet"
                  : "Every community starts with a hello"}
            </Copy>
            <Copy muted>
              {mode === "saved"
                ? "Tap Save on a post to find it here."
                : "Share a small win, ask a question or teach something useful. Share only what feels comfortable."}
            </Copy>
            {!author && mode !== "saved" && (
              <Button
                label="Write a post"
                onPress={() =>
                  router.push(
                    profile.data
                      ? "/community/compose"
                      : "/community/edit-profile",
                  )
                }
              />
            )}
          </Card>
        )
      }
      ListFooterComponent={
        feed.isFetchingNextPage ? (
          <ActivityIndicator />
        ) : feed.isFetchNextPageError ? (
          <Button
            label="Retry loading more"
            onPress={() => void feed.fetchNextPage()}
          />
        ) : undefined
      }
    />
  );
}
