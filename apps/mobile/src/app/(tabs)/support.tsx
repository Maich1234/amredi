import React, { useState } from "react";
import { ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { db } from "../../backend";
import { useSession } from "../../session";
import { conversations } from "../../conversations";
import { useProfile } from "../../queries";
import { router } from "expo-router";
import { Button, Card, Copy, s } from "../../ui";
export default function Support() {
  const { session } = useSession();
  const profile = useProfile();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const assigned = useQuery({
    queryKey: ["conversations"],
    queryFn: conversations,
  });
  const request = useQuery({
    queryKey: ["mentor-request"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("mentor_requests")
        .select("id,status")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  async function submit() {
    if (!profile.data) {
      router.push("/onboarding");
      return;
    }
    setBusy(true);
    try {
      const { error } = await db()
        .from("mentor_requests")
        .insert({ member_id: session!.user.id });
      if (error) throw error;
      await request.refetch();
      setMessage(
        "Request received. The team will help find a suitable mentor.",
      );
    } catch {
      setMessage("Could not send your request. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Copy size={28} strong>
        Someone in your corner.
      </Copy>
      <Copy muted>Support starts with a conversation, at your pace.</Copy>
      {assigned.data?.map((c) => (
        <Card key={c.id}>
          <Copy strong size={22}>
            {c.mentorships.mentors?.display_name || "Your assigned mentor"}
          </Copy>
          <Copy muted>{c.mentorships.mentors?.bio}</Copy>
          {c.mentorships.status === "closed" && (
            <Copy muted>Mentorship closed · history available</Copy>
          )}
          <Button
            secondary
            label="Our milestones"
            onPress={() =>
              router.push({
                pathname: "/milestones/[id]",
                params: { id: c.mentorship_id },
              })
            }
          />
          <Button
            label="Open conversation"
            onPress={() =>
              router.push({ pathname: "/chat/[id]", params: { id: c.id } })
            }
          />
        </Card>
      ))}
      <Card>
        <Copy size={23} strong>
          Let’s find your mentor.
        </Copy>
        <Copy muted>
          The Amredi team matches you with an approved mentor around your goals
          and availability.
        </Copy>
        {request.isPending ? (
          <Copy>Checking your request…</Copy>
        ) : request.isError ? (
          <Button
            secondary
            label="Retry"
            onPress={() => void request.refetch()}
          />
        ) : request.data ? (
          <>
            <Copy strong>Request status: {request.data.status}</Copy>
            {request.data.status === "closed" && (
              <Button
                label="Request a new mentor"
                busy={busy}
                onPress={submit}
              />
            )}
          </>
        ) : (
          <Button label="Request a mentor" busy={busy} onPress={submit} />
        )}
      </Card>
      {!!message && <Copy>{message}</Copy>}
    </ScrollView>
  );
}
