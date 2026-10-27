import { randomUUID } from "expo-crypto";
import React, { useState } from "react";
import { ScrollView } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { db } from "../../backend";
import { useSession } from "../../session";
import { Button, Card, Copy, Field, s } from "../../ui";
type Milestone = {
  id: string;
  title: string;
  status: "proposed" | "agreed" | "completed";
};
export default function Milestones() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const cache = useQueryClient();
  const [pending, setPending] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const assignment = useQuery({
    queryKey: ["mentorship", id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await db()
        .from("mentorships")
        .select("id,mentor_id,status")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const query = useInfiniteQuery({
    queryKey: ["milestones", id],
    enabled: !!assignment.data,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await db()
        .from("milestones")
        .select("id,title,status")
        .eq("mentorship_id", id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(pageParam, pageParam + 19);
      if (error) throw error;
      return data as Milestone[];
    },
    getNextPageParam: (last, pages) =>
      last.length === 20 ? pages.length * 20 : undefined,
  });
  if (!session) return <Redirect href="/auth" />;
  async function mutate(milestone?: Milestone) {
    if (busy) return;
    if (!milestone && (title.trim().length < 3 || title.trim().length > 200)) {
      setFeedback("Use a title between 3 and 200 characters.");
      return;
    }
    const pendingId =
      pending?.title === title.trim() ? pending.id : randomUUID();
    if (!milestone) setPending({ id: pendingId, title: title.trim() });
    setBusy(true);
    setFeedback("");
    try {
      const request = milestone
        ? db()
            .from("milestones")
            .update({
              status: milestone.status === "proposed" ? "agreed" : "completed",
            })
            .eq("id", milestone.id)
            .eq("status", milestone.status)
            .select("id")
        : db()
            .from("milestones")
            .insert({
              id: pendingId,
              mentorship_id: id,
              created_by: session!.user.id,
              title: title.trim(),
            })
            .select("id");
      const { data, error } = await request;
      if (
        (error && (milestone || error.code !== "23505")) ||
        (!error && !data?.length)
      )
        throw error;
      if (!milestone) {
        setTitle("");
        setPending(null);
      }
      await cache.invalidateQueries({ queryKey: ["milestones", id] });
    } catch {
      setFeedback("We couldn’t save this step. Refresh and try again.");
    } finally {
      setBusy(false);
    }
  }
  const active = assignment.data?.status === "active";
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Copy size={34} strong>
        Small steps. Real progress.
      </Copy>
      <Copy muted>
        Suggest a step together. Your mentor agrees it before recording
        completion.
      </Copy>
      {assignment.isPending ? (
        <Copy>Loading mentorship…</Copy>
      ) : assignment.isError ? (
        <Button
          label="Retry mentorship"
          onPress={() => void assignment.refetch()}
        />
      ) : (
        <>
          {active && (
            <Card>
              <Field
                label="Propose a next step"
                value={title}
                onChangeText={setTitle}
                maxLength={200}
              />
              <Button
                label="Suggest this step"
                onPress={() => void mutate()}
                busy={busy}
              />
            </Card>
          )}
          {!!feedback && <Copy>{feedback}</Copy>}
          {query.isPending ? (
            <Copy>Loading milestones…</Copy>
          ) : query.isError ? (
            <Button
              label="Retry milestones"
              onPress={() => void query.refetch()}
            />
          ) : query.data?.pages.flat().length ? (
            query.data.pages.flat().map((m) => (
              <Card key={m.id}>
                <Copy strong size={21}>
                  {m.title}
                </Copy>
                <Copy muted>
                  {m.status === "completed"
                    ? "✓ Completed"
                    : m.status === "agreed"
                      ? "Agreed next step"
                      : "Proposed · awaiting agreement"}
                </Copy>
                {active &&
                  assignment.data.mentor_id === session.user.id &&
                  m.status !== "completed" && (
                    <Button
                      secondary
                      label={
                        m.status === "proposed"
                          ? "Agree this step"
                          : "Mark completed"
                      }
                      busy={busy}
                      onPress={() => void mutate(m)}
                    />
                  )}
              </Card>
            ))
          ) : (
            <Card>
              <Copy muted>
                Your first milestone starts with one practical step.
              </Copy>
            </Card>
          )}
          {query.hasNextPage && (
            <Button
              label="Earlier milestones"
              busy={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}
