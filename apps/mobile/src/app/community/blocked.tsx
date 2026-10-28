import React, { useState } from "react";
import { FlatList } from "react-native";
import { Redirect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "../../backend";
import { useSession } from "../../session";
import { Copy, Button, Card, s } from "../../ui";
export default function Blocked() {
  const { session } = useSession();
  const cache = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const list = useQuery({
    queryKey: ["community", "blocked", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await db()
        .from("community_blocks")
        .select("blocked_id")
        .eq("blocker_id", session!.user.id)
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  if (!session) return <Redirect href="/auth" />;
  async function unblock(id: string) {
    setBusy(id);
    setError("");
    const { error } = await db()
      .from("community_blocks")
      .delete()
      .eq("blocker_id", session!.user.id)
      .eq("blocked_id", id);
    if (error) setError("Couldn’t unblock this member. Try again.");
    else await cache.invalidateQueries({ queryKey: ["community"] });
    setBusy(null);
  }
  return (
    <FlatList
      contentContainerStyle={s.page}
      data={list.data ?? []}
      keyExtractor={(i) => i.blocked_id}
      ListHeaderComponent={
        <>
          <Copy strong size={24}>
            Blocked members
          </Copy>
          <Copy muted>
            Unblocking makes your community content visible to each other again.
          </Copy>
          {!!error && <Copy>{error}</Copy>}
        </>
      }
      renderItem={({ item, index }) => (
        <Card>
          <Copy strong>Blocked member {index + 1}</Copy>
          <Copy muted size={12}>
            Account {item.blocked_id.slice(-8)}
          </Copy>
          <Button
            secondary
            label="Unblock member"
            busy={busy === item.blocked_id}
            disabled={!!busy}
            onPress={() => void unblock(item.blocked_id)}
          />
        </Card>
      )}
      ListEmptyComponent={
        list.isError ? (
          <Button label="Retry" onPress={() => void list.refetch()} />
        ) : (
          <Copy muted>
            {list.isPending ? "Loading…" : "You haven’t blocked anyone."}
          </Copy>
        )
      }
    />
  );
}
