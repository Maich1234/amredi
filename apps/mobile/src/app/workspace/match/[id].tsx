import React, { useState } from "react";
import { FlatList, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { db } from "../../../backend";
import { useSession } from "../../../session";
import { useAccess } from "../../../access";
import { ScrollAccess } from "../../../access-ui";
import { Button, Card, Copy, Empty, s } from "../../../ui";
type Mentor = { id: string; display_name: string; bio: string };
export default function Match() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const access = useAccess();
  const cache = useQueryClient();
  const [selected, setSelected] = useState<Mentor | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const request = useQuery({
    queryKey: ["matching-request", id],
    enabled: !!access.data?.staff,
    queryFn: async () => {
      const { data, error } = await db()
        .from("mentor_requests")
        .select("id,status,profiles(display_name,goal)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as {
        id: string;
        status: string;
        profiles: { display_name: string; goal: string };
      };
    },
  });
  const mentors = useInfiniteQuery({
    queryKey: ["approved-mentors"],
    enabled: !!access.data?.staff,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await db()
        .from("mentors")
        .select("id,display_name,bio")
        .eq("verified", true)
        .order("display_name")
        .order("id")
        .range(pageParam, pageParam + 19);
      if (error) throw error;
      return data as Mentor[];
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
  async function assign() {
    if (!selected || !agreed || busy) return;
    setBusy(true);
    setFeedback("");
    try {
      const { error } = await db().rpc("match_mentor", {
        p_request: id,
        p_mentor: selected.id,
      });
      if (error) throw error;
      await cache.invalidateQueries({ queryKey: ["matching-requests"] });
      await cache.invalidateQueries({ queryKey: ["active-assignments"] });
      await cache.invalidateQueries({ queryKey: ["conversations"] });
      router.back();
    } catch {
      setFeedback(
        "We couldn’t create this match. The request may have changed or this mentor may no longer be available. Refresh and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <FlatList
      contentContainerStyle={s.page}
      data={mentors.data?.pages.flat() ?? []}
      keyExtractor={(m) => m.id}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          <Copy size={32} strong>
            A thoughtful match starts here.
          </Copy>
          {request.isPending ? (
            <Copy>Loading request…</Copy>
          ) : request.isError ? (
            <Button
              label="Retry request"
              onPress={() => void request.refetch()}
            />
          ) : (
            <Card>
              <Copy strong>
                {request.data.profiles?.display_name || "Member"}
              </Copy>
              <Copy muted>{request.data.profiles?.goal}</Copy>
              <Copy>Status: {request.data.status}</Copy>
            </Card>
          )}
          {selected && (
            <Card>
              <Copy strong>Assign {selected.display_name}?</Copy>
              <Copy muted>
                Confirm that you have checked fit, availability and agreement
                with both people. Formal consent requirements still follow the
                pilot’s safeguarding process.
              </Copy>
              <Button
                secondary
                label={
                  agreed
                    ? "✓ Agreement checked"
                    : "Confirm agreement with both people"
                }
                onPress={() => setAgreed(!agreed)}
                disabled={busy}
              />
              <Button
                label="Confirm mentor assignment"
                onPress={assign}
                busy={busy}
                disabled={!agreed || request.data?.status !== "pending"}
              />
              <Button
                secondary
                label="Choose someone else"
                onPress={() => {
                  setSelected(null);
                  setAgreed(false);
                }}
                disabled={busy}
              />
            </Card>
          )}
          {!!feedback && <Copy>{feedback}</Copy>}
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ marginTop: 16 }}>
          <Card>
            <Copy strong size={22}>
              {item.display_name}
            </Copy>
            <Copy muted>{item.bio}</Copy>
            <Button
              secondary
              label="Select mentor"
              onPress={() => {
                setSelected(item);
                setAgreed(false);
              }}
              disabled={busy || request.data?.status !== "pending"}
            />
          </Card>
        </View>
      )}
      ListEmptyComponent={
        mentors.isPending ? (
          <Copy>Loading approved mentors…</Copy>
        ) : mentors.isError ? (
          <Button
            label="Retry mentors"
            onPress={() => void mentors.refetch()}
          />
        ) : (
          <Empty
            title="No approved mentors yet."
            body="A trusted operator must verify mentors before they can be assigned."
          />
        )
      }
      ListFooterComponent={
        mentors.hasNextPage ? (
          <Button
            label="More mentors"
            busy={mentors.isFetchingNextPage}
            onPress={() => void mentors.fetchNextPage()}
          />
        ) : undefined
      }
    />
  );
}
