import React from "react";
import { FlatList, View } from "react-native";
import { Redirect } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { db } from "../../backend";
import { useAccess } from "../../access";
import { useSession } from "../../session";
import { ScrollAccess } from "../../access-ui";
import { Button, Card, Copy, Empty, s } from "../../ui";
type AuditEntry = {
  id: number;
  actor_id: string | null;
  source: string;
  resource: string;
  resource_id: string;
  action: string;
  before_state: string | null;
  after_state: string | null;
  created_at: string;
};
export default function Audit() {
  const { session } = useSession();
  const access = useAccess();
  const query = useInfiniteQuery({
    queryKey: ["audit-events"],
    enabled: !!access.data?.staff,
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      let request = db()
        .from("audit_events")
        .select("*")
        .order("id", { ascending: false })
        .limit(20);
      if (pageParam !== null) request = request.lt("id", pageParam);
      const { data, error } = await request;
      if (error) throw error;
      return data as AuditEntry[];
    },
    getNextPageParam: (last) =>
      last.length === 20 ? last[last.length - 1].id : undefined,
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
      keyExtractor={(e) => String(e.id)}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          <Copy size={32} strong>
            A clear record of team actions.
          </Copy>
          <Copy muted>
            Recorded by the database. Entries contain action metadata, without
            private message text or report reasons.
          </Copy>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ marginTop: 16 }}>
          <Card>
            <Copy strong>
              {item.action} · {item.resource.replaceAll("_", " ")}
            </Copy>
            <Copy muted>{new Date(item.created_at).toLocaleString()}</Copy>
            <Copy size={13}>
              Actor: {item.actor_id || "Trusted database operator"}
            </Copy>
            <Copy size={13}>Record: {item.resource_id}</Copy>
            {item.after_state !== null && (
              <Copy>
                {item.before_state ?? "New"} → {item.after_state}
              </Copy>
            )}
          </Card>
        </View>
      )}
      ListEmptyComponent={
        query.isPending ? (
          <Copy>Loading audit history…</Copy>
        ) : query.isError ? (
          <Button label="Retry history" onPress={() => void query.refetch()} />
        ) : (
          <Empty
            title="No recorded actions yet."
            body="Programme changes, application decisions, mentor matching and report reviews will appear here."
          />
        )
      }
      ListFooterComponent={
        query.hasNextPage ? (
          <Button
            label="Earlier activity"
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
