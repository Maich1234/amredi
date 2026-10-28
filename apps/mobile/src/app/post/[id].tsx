import React, { useState } from "react";
import {
  FlatList,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { db } from "../../backend";
import { useSession } from "../../session";
import {
  useCommunityProfile,
  usePost,
  friendlyError,
  Cursor,
} from "../../community/data";
import { PrivateImage } from "../../community/media";
import { PostCard, Action } from "../../community/PostCard";
import { Copy, Button, Field, Card, s } from "../../ui";
export default function Discussion() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const post = usePost(id);
  const profile = useCommunityProfile();
  const cache = useQueryClient();
  const [body, setBody] = useState("");
  const [nonce, setNonce] = useState(() => randomUUID());
  const [error, setError] = useState("");
  const comments = useInfiniteQuery({
    queryKey: ["community", "comments", session?.user.id, id],
    enabled: !!session && !!post.data,
    initialPageParam: null as Cursor,
    queryFn: async ({ pageParam }) => {
      let q = db()
        .from("community_comments")
        .select("*,community_profiles(*)")
        .eq("post_id", id)
        .eq("hidden", false)
        .order("created_at")
        .order("id")
        .limit(25);
      if (pageParam)
        q = q.or(
          `created_at.gt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.gt.${pageParam.id})`,
        );
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    getNextPageParam: (page) =>
      page.length === 25
        ? { created_at: page[24].created_at, id: page[24].id }
        : undefined,
  });
  const send = useMutation({
    mutationFn: async () => {
      const { error } = await db()
        .from("community_comments")
        .insert({
          id: nonce,
          post_id: id,
          author_id: session!.user.id,
          body: body.trim(),
        });
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: async () => {
      setBody("");
      setNonce(randomUUID());
      setError("");
      await cache.invalidateQueries({ queryKey: ["community"] });
    },
    onError: (e) => setError(friendlyError(e)),
  });
  if (!session) return <Redirect href="/auth" />;
  if (post.isPending) return <ActivityIndicator />;
  if (post.isError)
    return (
      <View style={s.page}>
        <Copy>We couldn’t load this conversation.</Copy>
        <Button label="Retry" onPress={() => void post.refetch()} />
      </View>
    );
  if (!post.data)
    return (
      <View style={s.page}>
        <Copy>This post is no longer available.</Copy>
      </View>
    );
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.page}
        data={comments.data?.pages.flat() ?? []}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 16 }}>
            <PostCard post={post.data} detail />
            <Copy strong size={20}>
              Conversation
            </Copy>
            {profile.isError ? (
              <Button
                label="Retry profile"
                onPress={() => void profile.refetch()}
              />
            ) : !profile.data ? (
              <Button
                label="Set up profile to comment"
                onPress={() => router.push("/community/edit-profile")}
              />
            ) : post.data.comments_enabled ? (
              <>
                <Field
                  label="Add a kind, helpful comment"
                  value={body}
                  onChangeText={setBody}
                  maxLength={1000}
                  multiline
                  editable={!send.isPending}
                />
                <Button
                  label="Post comment"
                  disabled={!body.trim()}
                  busy={send.isPending}
                  onPress={() => send.mutate()}
                />
              </>
            ) : (
              <Copy muted>Comments are turned off for this post.</Copy>
            )}
            {!!error && <Copy>{error}</Copy>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <Card>
              <View style={s.row}>
                <PrivateImage
                  avatar
                  path={item.community_profiles?.avatar_path ?? null}
                  label={item.community_profiles?.display_name ?? "Member"}
                />
                <View style={{ flex: 1 }}>
                  <Copy strong size={14}>
                    {item.community_profiles?.display_name ??
                      "Community member"}
                  </Copy>
                  <Copy muted size={12}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Copy>
                </View>
                <Action
                  icon="dots-horizontal"
                  label="Options"
                  onPress={() =>
                    router.push({
                      pathname: "/community/options",
                      params: {
                        post: id,
                        comment: item.id,
                        author: item.author_id,
                      },
                    })
                  }
                />
              </View>
              <Copy>{item.body}</Copy>
            </Card>
          </View>
        )}
        ListEmptyComponent={
          comments.isPending ? (
            <ActivityIndicator />
          ) : comments.isError ? (
            <Button
              label="Retry comments"
              onPress={() => void comments.refetch()}
            />
          ) : (
            <Copy muted>
              No comments yet. A little encouragement goes a long way.
            </Copy>
          )
        }
        ListFooterComponent={
          comments.hasNextPage ? (
            <Button
              secondary
              label="Load more comments"
              busy={comments.isFetchingNextPage}
              onPress={() => void comments.fetchNextPage()}
            />
          ) : undefined
        }
      />
    </KeyboardAvoidingView>
  );
}
