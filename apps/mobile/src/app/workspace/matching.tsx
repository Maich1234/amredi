import React, { useState } from "react";
import { FlatList, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "../../backend";
import { useAccess } from "../../access";
import { useSession } from "../../session";
import { ScrollAccess } from "../../access-ui";
import { Button, Card, Copy, Empty, s } from "../../ui";
type Request = {
  id: string;
  created_at: string;
  profiles: { display_name: string; goal: string } | null;
};
type Assignment = {
  id: string;
  profiles: { display_name: string } | null;
  mentors: { display_name: string } | null;
};
export default function Matching() {
  const { session } = useSession();
  const access = useAccess();
  const cache = useQueryClient();
  const [view, setView] = useState<"requests" | "active">("requests");
  const [closing, setClosing] = useState<Assignment | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const requests = useInfiniteQuery({
    queryKey: ["matching-requests"],
    enabled: !!access.data?.staff && view === "requests",
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await db()
        .from("mentor_requests")
        .select("id,created_at,profiles(display_name,goal)")
        .eq("status", "pending")
        .order("created_at")
        .order("id")
        .range(pageParam, pageParam + 19);
      if (error) throw error;
      return data as unknown as Request[];
    },
    getNextPageParam: (last, pages) =>
      last.length === 20 ? pages.length * 20 : undefined,
  });
  const active = useInfiniteQuery({
    queryKey: ["active-assignments"],
    enabled: !!access.data?.staff && view === "active",
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await db()
        .from("mentorships")
        .select("id,profiles(display_name),mentors(display_name)")
        .eq("status", "active")
        .order("created_at")
        .order("id")
        .range(pageParam, pageParam + 19);
      if (error) throw error;
      return data as unknown as Assignment[];
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
  const query = view === "requests" ? requests : active;
  async function close() {
    if (!closing || busy) return;
    setBusy(true);
    setFeedback("");
    try {
      const { error } = await db().rpc("close_mentorship", {
        p_mentorship: closing.id,
      });
      if (error) throw error;
      setClosing(null);
      await cache.invalidateQueries({ queryKey: ["active-assignments"] });
      await cache.invalidateQueries({ queryKey: ["matching-requests"] });
      setFeedback(
        "Mentorship closed. Message history remains available, and new messages and milestones are stopped.",
      );
    } catch {
      setFeedback("We couldn’t close this mentorship. Refresh and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <FlatList
      contentContainerStyle={s.page}
      data={(query.data?.pages.flat() ?? []) as (Request | Assignment)[]}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          <Copy size={32} strong>
            Connect the right people.
          </Copy>
          <Copy muted>
            Confirm fit and agreement with both people before assigning a
            mentor.
          </Copy>
          <Button
            secondary={view !== "requests"}
            label="Pending requests"
            onPress={() => setView("requests")}
          />
          <Button
            secondary={view !== "active"}
            label="Active mentorships"
            onPress={() => setView("active")}
          />
          {!!feedback && <Copy>{feedback}</Copy>}
          {closing && (
            <Card>
              <Copy strong>
                Close {closing.profiles?.display_name || "this member"}’s
                mentorship?
              </Copy>
              <Copy muted>
                This stops new messages and milestone changes. Existing history
                stays available to the participants.
              </Copy>
              <Button label="Confirm closure" busy={busy} onPress={close} />
              <Button
                secondary
                disabled={busy}
                label="Keep mentorship active"
                onPress={() => setClosing(null)}
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
            {"created_at" in item ? (
              <>
                <Copy muted>{item.profiles?.goal}</Copy>
                <Copy size={13}>
                  Requested {new Date(item.created_at).toLocaleDateString()}
                </Copy>
                <Button
                  label="Choose an approved mentor"
                  onPress={() =>
                    router.push({
                      pathname: "/workspace/match/[id]",
                      params: { id: item.id },
                    })
                  }
                />
              </>
            ) : (
              <>
                <Copy muted>
                  Mentor: {item.mentors?.display_name || "Unavailable"}
                </Copy>
                <Button
                  secondary
                  label="Close mentorship"
                  disabled={busy}
                  onPress={() => setClosing(item)}
                />
              </>
            )}
          </Card>
        </View>
      )}
      ListEmptyComponent={
        query.isPending ? (
          <Copy>Loading support queue…</Copy>
        ) : query.isError ? (
          <Button label="Retry queue" onPress={() => void query.refetch()} />
        ) : (
          <Empty
            title={
              view === "requests"
                ? "No pending requests."
                : "No active mentorships."
            }
            body="Updates will appear here as members request support and mentors are assigned."
          />
        )
      }
      ListFooterComponent={
        query.hasNextPage ? (
          <Button
            label="Show more"
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
