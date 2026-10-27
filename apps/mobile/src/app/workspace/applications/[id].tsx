import React, { useState } from "react";
import { FlatList, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "../../../backend";
import { useAccess } from "../../../access";
import { useSession } from "../../../session";
import { ScrollAccess } from "../../../access-ui";
import { Button, Card, Copy, Empty, s } from "../../../ui";
type Application = {
  id: string;
  member_id: string;
  status: string;
  profiles: { display_name: string; goal: string };
};
export default function Applications() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const access = useAccess();
  const cache = useQueryClient();
  const [decision, setDecision] = useState<{
    application: Application;
    status: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["staff-applications", id],
    enabled: !!access.data?.staff,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await db()
        .from("applications")
        .select("id,member_id,status,profiles(display_name,goal)")
        .eq("programme_id", id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(pageParam, pageParam + 19);
      if (error) throw error;
      return data as unknown as Application[];
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
  async function decide(a: Application, status: string) {
    if (busy) return;
    setBusy(true);
    setFeedback("");
    try {
      const { data, error } = await db()
        .from("applications")
        .update({ status })
        .eq("id", a.id)
        .eq("status", a.status)
        .select("id");
      if (error || !data?.length) throw error;
      await cache.invalidateQueries({ queryKey: ["staff-applications", id] });
      await cache.invalidateQueries({ queryKey: ["applications"] });
      setDecision(null);
      setFeedback("Application updated.");
    } catch {
      setFeedback(
        "Couldn’t update this application. It may have changed. Refresh and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <FlatList
      contentContainerStyle={s.page}
      data={query.data?.pages.flat() ?? []}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={
        <View style={{ gap: 16 }}>
          <Copy size={32} strong>
            Help someone take their next step.
          </Copy>
          {!!feedback && <Copy>{feedback}</Copy>}
          {decision && (
            <Card>
              <Copy strong>
                {decision.status === "accepted" ? "Accept" : "Decline"}{" "}
                {decision.application.profiles?.display_name || "this member"}’s
                application?
              </Copy>
              <Copy muted>
                This decision will appear in the member’s application status.
                Check it before confirming.
              </Copy>
              <Button
                label="Confirm decision"
                busy={busy}
                onPress={() =>
                  void decide(decision.application, decision.status)
                }
              />
              <Button
                secondary
                label="Cancel"
                disabled={busy}
                onPress={() => setDecision(null)}
              />
            </Card>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ marginTop: 16 }}>
          <Card>
            <Copy strong size={22}>
              {item.profiles?.display_name || "Member"}
            </Copy>
            <Copy muted>{item.profiles?.goal}</Copy>
            <Copy strong>{item.status.replaceAll("_", " ")}</Copy>
            {["submitted", "under_review"].includes(item.status) &&
              item.member_id !== session.user.id && (
                <>
                  {item.status === "submitted" && (
                    <Button
                      secondary
                      label="Begin review"
                      disabled={busy}
                      onPress={() => void decide(item, "under_review")}
                    />
                  )}
                  <Button
                    label="Accept application"
                    disabled={busy}
                    onPress={() =>
                      setDecision({ application: item, status: "accepted" })
                    }
                  />
                  <Button
                    secondary
                    label="Decline application"
                    disabled={busy}
                    onPress={() =>
                      setDecision({ application: item, status: "declined" })
                    }
                  />
                </>
              )}
          </Card>
        </View>
      )}
      ListEmptyComponent={
        query.isPending ? (
          <Copy>Loading applications…</Copy>
        ) : query.isError ? (
          <Button
            label="Retry applications"
            onPress={() => void query.refetch()}
          />
        ) : (
          <Empty
            title="No applications yet."
            body="Applications will appear here after members apply."
          />
        )
      }
      ListFooterComponent={
        query.hasNextPage ? (
          <Button
            label="More applications"
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
