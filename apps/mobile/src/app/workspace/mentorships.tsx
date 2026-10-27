import React from "react";
import { FlatList, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { db } from "../../backend";
import { useAccess } from "../../access";
import { useSession } from "../../session";
import { ScrollAccess } from "../../access-ui";
import { Button, Card, Copy, Empty, s } from "../../ui";
type Assignment = {
  id: string;
  status: string;
  profiles: { display_name: string; goal: string } | null;
};
export default function Mentorships() {
  const { session } = useSession();
  const access = useAccess();
  const query = useInfiniteQuery({
    queryKey: ["mentor-workspace", session?.user.id],
    enabled: !!access.data?.mentor,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await db()
        .from("mentorships")
        .select("id,status,profiles(display_name,goal)")
        .eq("mentor_id", session!.user.id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(pageParam, pageParam + 19);
      if (error) throw error;
      return data as unknown as Assignment[];
    },
    getNextPageParam: (last, pages) =>
      last.length === 20 ? pages.length * 20 : undefined,
  });
  if (!session) return <Redirect href="/auth" />;
  if (!access.data?.mentor)
    return (
      <ScrollAccess
        pending={access.isPending}
        error={access.isError}
        retry={() => void access.refetch()}
      />
    );
  return (
    <FlatList
      contentContainerStyle={s.page}
      data={query.data?.pages.flat() ?? []}
      keyExtractor={(m) => m.id}
      ListHeaderComponent={
        <Copy size={34} strong>
          Your people. Their next step.
        </Copy>
      }
      renderItem={({ item }) => (
        <View style={{ marginTop: 16 }}>
          <Card>
            <Copy size={23} strong>
              {item.profiles?.display_name || "Former mentee"}
            </Copy>
            <Copy muted>
              {item.profiles?.goal || "This mentorship is closed."}
            </Copy>
            <Copy size={13}>{item.status}</Copy>
            <Button
              secondary
              label="View milestones"
              onPress={() =>
                router.push({
                  pathname: "/milestones/[id]",
                  params: { id: item.id },
                })
              }
            />
          </Card>
        </View>
      )}
      ListEmptyComponent={
        query.isPending ? (
          <Copy>Loading assigned members…</Copy>
        ) : query.isError ? (
          <Button
            label="Retry assignments"
            onPress={() => void query.refetch()}
          />
        ) : (
          <Empty
            title="Your first connection is ahead."
            body="Approved assignments will appear here after the Amredi team matches you."
          />
        )
      }
      ListFooterComponent={
        query.hasNextPage ? (
          <Button
            label="More assignments"
            busy={query.isFetchingNextPage}
            onPress={() => void query.fetchNextPage()}
          />
        ) : undefined
      }
    />
  );
}
