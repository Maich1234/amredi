import React, { useState } from "react";
import { FlatList, View } from "react-native";
import { router } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { db } from "../backend";
import { useSession } from "../session";
import { Copy, Button, Card, s } from "../ui";
import { Cursor, friendlyError } from "./data";
export function Reports({ staff = false }: { staff?: boolean }) {
  const { session } = useSession();
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [resolved, setResolved] = useState(false);
  const list = useInfiniteQuery({
    queryKey: ["community", "reports", session?.user.id, staff, resolved],
    enabled: !!session,
    initialPageParam: null as Cursor,
    queryFn: async ({ pageParam }) => {
      let q = db()
        .from("community_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(20);
      if (staff) q = q.eq("resolved", resolved);
      else q = q.eq("reporter_id", session!.user.id);
      if (pageParam)
        q = q.or(
          `created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`,
        );
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    getNextPageParam: (page) =>
      page.length === 20
        ? { created_at: page[19].created_at, id: page[19].id }
        : undefined,
  });
  const review = useMutation({
    mutationFn: async ({
      id,
      post,
      comment,
      hide,
    }: {
      id: string;
      post: string | null;
      comment: string | null;
      hide: boolean;
    }) => {
      if (hide) {
        const target = comment ?? post;
        if (!target) throw new Error("Content removed");
        const { error } = await db()
          .from(comment ? "community_comments" : "community_posts")
          .update({ hidden: true })
          .eq("id", target)
          .select("id")
          .single();
        if (error) throw error;
      } else {
        const { error } = await db()
          .from("community_reports")
          .update({ resolved: true })
          .eq("id", id)
          .select("id")
          .single();
        if (error) throw error;
      }
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ["community"] }),
    onError: (e) => setError(friendlyError(e)),
  });
  return (
    <FlatList
      contentContainerStyle={s.page}
      data={list.data?.pages.flat() ?? []}
      keyExtractor={(i) => i.id}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 16 }}>
          <Copy strong size={24}>
            {staff ? "Community reports" : "Your community reports"}
          </Copy>
          <Copy muted>
            {staff
              ? "Review the captured content before taking action. Hiding content and resolving a report are separate decisions."
              : "Reports are private. The team reviews the content you flagged."}
          </Copy>
          {staff && (
            <Button
              secondary
              label={resolved ? "Show open reports" : "Show resolved reports"}
              onPress={() => setResolved(!resolved)}
            />
          )}{" "}
          {!!error && <Copy>{error}</Copy>}
        </View>
      }
      renderItem={({ item }) => (
        <Card>
          <Copy strong>
            {item.comment_id ? "Comment report" : "Post report"} ·{" "}
            {item.resolved ? "Resolved" : "Awaiting review"}
          </Copy>
          <Copy muted size={13}>
            {new Date(item.created_at).toLocaleDateString()}
          </Copy>
          <Copy strong>Reason</Copy>
          <Copy>{item.reason}</Copy>
          <Copy strong>Reported content</Copy>
          <Copy>{item.excerpt}</Copy>
          {!!item.post_id && (
            <Button
              secondary
              label="View reported post"
              onPress={() =>
                router.push({
                  pathname: "/post/[id]",
                  params: { id: item.post_id! },
                })
              }
            />
          )}{" "}
          {staff && !item.resolved && (
            <>
              <Button
                secondary
                label="Hide reported content"
                busy={review.isPending}
                disabled={!item.post_id && !item.comment_id}
                onPress={() =>
                  review.mutate({
                    id: item.id,
                    post: item.post_id,
                    comment: item.comment_id,
                    hide: true,
                  })
                }
              />
              <Button
                label="Mark report resolved"
                busy={review.isPending}
                onPress={() =>
                  review.mutate({
                    id: item.id,
                    post: null,
                    comment: null,
                    hide: false,
                  })
                }
              />
            </>
          )}
        </Card>
      )}
      ListEmptyComponent={
        list.isError ? (
          <Button label="Retry reports" onPress={() => void list.refetch()} />
        ) : (
          <Copy muted>
            {list.isPending ? "Loading reports…" : "No reports to show."}
          </Copy>
        )
      }
      ListFooterComponent={
        list.hasNextPage ? (
          <Button
            secondary
            label="Load more reports"
            busy={list.isFetchingNextPage}
            onPress={() => void list.fetchNextPage()}
          />
        ) : undefined
      }
    />
  );
}
