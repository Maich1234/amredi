import React, { useState } from "react";
import { ScrollView } from "react-native";
import { Redirect, router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "../session";
import { db, goals } from "../backend";
import { Button, Copy, Field, s } from "../ui";
export default function Onboarding() {
  const { session } = useSession();
  const cache = useQueryClient();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(goals[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!session) return <Redirect href="/auth" />;
  async function save() {
    if (!name.trim() || name.trim().length > 60) {
      setError("Choose a name between 1 and 60 characters.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await db()
        .from("profiles")
        .upsert({ id: session!.user.id, display_name: name.trim(), goal });
      if (error) throw error;
      await cache.invalidateQueries({ queryKey: ["profile"] });
      router.replace("/(tabs)");
    } catch {
      setError("Your changes could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Copy size={34} strong>
        What does your next chapter look like?
      </Copy>
      <Copy muted>
        You can change this later. You never need to share your story to get
        started.
      </Copy>
      <Field
        label="What should we call you?"
        value={name}
        maxLength={60}
        onChangeText={setName}
      />
      <Copy strong>I’d like to…</Copy>
      {goals.map((g) => (
        <Button
          key={g}
          secondary={goal !== g}
          label={(goal === g ? "✓  " : "") + g}
          onPress={() => setGoal(g)}
        />
      ))}
      {!!error && <Copy>{error}</Copy>}
      <Button label="Save my next step" onPress={save} busy={busy} />
    </ScrollView>
  );
}
