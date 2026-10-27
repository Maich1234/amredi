import React, { useCallback } from "react";
import { FlatList, View } from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { db } from "../backend";
import { useSession } from "../session";
import { Button, Card, Copy, Empty, s } from "../ui";
type Report = {
  id: string;
  reason: string;
  review_state: string;
  outcome: string;
  created_at: string;
};
export default function MyReports() {
  const { session } = useSession();
  const userId = session?.user.id;
  const query = useInfiniteQuery({
    queryKey: ["my-reports", userId],
    enabled: !!userId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await db()
        .from("message_reports")
        .select("id,reason,review_state,outcome,created_at")
        .eq("reporter_id", userId!)
        .order("created_at", { ascending: false })
        .order("id")
        .range(pageParam, pageParam + 19);
      if (error) throw error;
      return data as Report[];
    },
    getNextPageParam: (last, pages) =>
      last.length === 20 ? pages.length * 20 : undefined,
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (userId) void refetch();
    }, [userId, refetch]),
  );
  if (!session) return <Redirect href="/auth" />;
  return (
    <FlatList
      contentContainerStyle={s.page}
      data={query.data?.pages.flat() ?? []}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          <Copy size={32} strong>
            Your voice matters.
          </Copy>
          <Copy muted>
            Follow the reports you’ve shared with the Amredi team.
          </Copy>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ marginTop: 16 }}>
          <Card>
            <Copy strong>
              {item.review_state === "open"
                ? "Received"
                : item.review_state === "reviewed"
                  ? "Under review"
                  : item.review_state === "resolved"
                    ? "Resolved"
                    : "Review complete"}
            </Copy>
            <Copy size={13} muted>
              {new Date(item.created_at).toLocaleDateString()}
            </Copy>
            <Copy>{item.reason}</Copy>
            {!!item.outcome && (
              <>
                <Copy strong>Update from the team</Copy>
                <Copy>{item.outcome}</Copy>
              </>
            )}
          </Card>
        </View>
      )}
      ListEmptyComponent={
        query.isPending ? (
          <Copy>Loading your reports…</Copy>
        ) : query.isError ? (
          <Button label="Retry reports" onPress={() => void refetch()} />
        ) : (
          <Empty
            title="You haven’t submitted any reports."
            body="Use Report message in a conversation if you need the team to review something."
          />
        )
      }
      ListFooterComponent={
        query.hasNextPage ? (
          <Button
            label="Earlier reports"
            busy={query.isFetchingNextPage}
            onPress={() => void query.fetchNextPage()}
          />
        ) : undefined
      }
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => void refetch()}
    />
  );
}
