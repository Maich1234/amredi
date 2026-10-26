import React, { useState } from "react";
import { ScrollView } from "react-native";
import { Redirect, useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, Programme } from "../../backend";
import { useSession } from "../../session";
import { useProfile } from "../../queries";
import { Button, Card, Copy, s } from "../../ui";
export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const profile = useProfile();
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["programme", id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await db()
        .from("programmes")
        .select("*")
        .eq("id", id)
        .eq("published", true)
        .single();
      if (error) throw error;
      return data as Programme;
    },
  });
  if (!session) return <Redirect href="/auth" />;
  async function apply() {
    if (!profile.data) {
      router.push("/onboarding");
      return;
    }
    setBusy(true);
    try {
      const { error } = await db()
        .from("applications")
        .insert({ programme_id: id, member_id: session!.user.id });
      if (error) {
        if (error.code === "23505") {
          setMessage(
            "You’ve already applied. Follow your application on Today.",
          );
          return;
        }
        throw error;
      }
      setMessage("Application received. You can follow its progress on Today.");
      await cache.invalidateQueries({ queryKey: ["applications"] });
    } catch {
      setMessage("We couldn’t submit your application. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={s.page}>
      {query.isPending ? (
        <Copy>Loading opportunity…</Copy>
      ) : query.isError ? (
        <Card>
          <Copy>This opportunity could not be loaded.</Copy>
          <Button label="Try again" onPress={() => void query.refetch()} />
        </Card>
      ) : (
        <>
          <Copy size={13} strong>
            {query.data.category.toUpperCase()}
          </Copy>
          <Copy size={35} strong>
            {query.data.title}
          </Copy>
          <Card>
            <Copy strong>{query.data.location}</Copy>
            <Copy muted>{query.data.schedule}</Copy>
            <Copy>
              {query.data.cost_kes === 0
                ? "Free to participate"
                : `KES ${query.data.cost_kes}`}
            </Copy>
          </Card>
          <Copy>{query.data.description}</Copy>
          <Copy size={13} muted>
            Applying shares your preferred name and goal with the programme
            team.
          </Copy>
          <Button
            label="Apply for this opportunity"
            onPress={apply}
            busy={busy}
          />
          {!!message && (
            <Card>
              <Copy>{message}</Copy>
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}
