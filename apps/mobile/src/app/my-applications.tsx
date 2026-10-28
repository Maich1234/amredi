import React from "react";
import { FlatList } from "react-native";
import { Redirect, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../session";
import { db } from "../backend";
import { Copy, Button, Card, s } from "../ui";
export default function Applications() {
  const { session } = useSession();
  const list = useQuery({
    queryKey: ["applications", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await db()
        .from("applications")
        .select("id,status,programme_id,programmes(title)")
        .eq("member_id", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  if (!session) return <Redirect href="/auth" />;
  return (
    <FlatList
      contentContainerStyle={s.page}
      data={list.data ?? []}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={
        <Copy strong size={26}>
          Your applications
        </Copy>
      }
      renderItem={({ item }) => (
        <Card>
          <Copy strong>{item.programmes?.title ?? "Programme"}</Copy>
          <Copy muted>{item.status.replaceAll("_", " ")}</Copy>
          <Button
            secondary
            label="View programme"
            onPress={() =>
              router.push({
                pathname: "/programme/[id]",
                params: { id: item.programme_id },
              })
            }
          />
        </Card>
      )}
      ListEmptyComponent={
        list.isError ? (
          <Button label="Retry" onPress={() => void list.refetch()} />
        ) : (
          <Copy muted>
            {list.isPending
              ? "Loading…"
              : "When you apply for a programme, follow its progress here."}
          </Copy>
        )
      }
    />
  );
}
