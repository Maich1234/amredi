import React from "react";
import { FlatList, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { db } from "../../backend";
import { useAccess } from "../../access";
import { useSession } from "../../session";
import { ScrollAccess } from "../../access-ui";
import { Button, Card, Copy, Empty, s } from "../../ui";
type Programme = { id: string; title: string; published: boolean };
export default function Programmes() {
  const { session } = useSession();
  const access = useAccess();
  const query = useInfiniteQuery({
    queryKey: ["staff-programmes"],
    enabled: !!access.data?.staff,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await db()
        .from("programmes")
        .select("id,title,published")
        .order("created_at", { ascending: false })
        .order("id")
        .range(pageParam, pageParam + 19);
      if (error) throw error;
      return data as Programme[];
    },
    getNextPageParam: (last, pages) =>
      last.length === 20 ? pages.length * 20 : undefined,
  });
  if (!session) return <Redirect href="/auth" />;
  if (!access.data?.staff)
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
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View style={{ gap: 16 }}>
          <Copy size={34} strong>
            Open a door to opportunity.
          </Copy>
          <Button
            label="Create programme"
            onPress={() =>
              router.push({
                pathname: "/workspace/programme/[id]",
                params: { id: "new" },
              })
            }
          />
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ marginTop: 16 }}>
          <Card>
            <Copy strong size={22}>
              {item.title}
            </Copy>
            <Copy muted>{item.published ? "Published" : "Draft"}</Copy>
            <Button
              secondary
              label="Edit programme"
              onPress={() =>
                router.push({
                  pathname: "/workspace/programme/[id]",
                  params: { id: item.id },
                })
              }
            />
            <Button
              secondary
              label="Review applications"
              onPress={() =>
                router.push({
                  pathname: "/workspace/applications/[id]",
                  params: { id: item.id },
                })
              }
            />
          </Card>
        </View>
      )}
      ListEmptyComponent={
        query.isPending ? (
          <Copy>Loading programmes…</Copy>
        ) : query.isError ? (
          <Button
            label="Retry programmes"
            onPress={() => void query.refetch()}
          />
        ) : (
          <Empty
            title="Build your first opportunity."
            body="Create a draft, check the details and publish when it’s ready."
          />
        )
      }
      ListFooterComponent={
        query.hasNextPage ? (
          <Button
            label="More programmes"
            busy={query.isFetchingNextPage}
            onPress={() => void query.fetchNextPage()}
          />
        ) : undefined
      }
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => void query.refetch()}
    />
  );
}
