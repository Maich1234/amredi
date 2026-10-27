import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { randomUUID } from "expo-crypto";
import { db, Programme } from "../../../backend";
import { useAccess } from "../../../access";
import { useSession } from "../../../session";
import { ScrollAccess } from "../../../access-ui";
import { Button, Card, Copy, Field, s } from "../../../ui";
const schema = z.object({
  title: z.string().trim().min(3).max(140),
  category: z.enum(["Skills", "Education", "Livelihood"]),
  location: z.string().trim().min(2).max(200),
  description: z.string().trim().min(20).max(10000),
  schedule: z.string().trim().min(3).max(500),
  cost_kes: z.coerce.number().int().min(0).max(10000000),
  published: z.boolean(),
});
type FormData = z.infer<typeof schema>;
export default function Editor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const access = useAccess();
  const query = useQuery({
    queryKey: ["staff-programme", id],
    enabled: !!access.data?.staff && id !== "new",
    queryFn: async () => {
      const { data, error } = await db()
        .from("programmes")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Programme & { published: boolean };
    },
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
  if (id !== "new" && query.isPending)
    return <ScrollAccess pending error={false} retry={() => {}} />;
  if (query.isError)
    return (
      <ScrollAccess pending={false} error retry={() => void query.refetch()} />
    );
  return <ProgrammeForm key={id} id={id} initial={query.data} />;
}
function ProgrammeForm({
  id,
  initial,
}: {
  id: string;
  initial?: Programme & { published: boolean };
}) {
  const cache = useQueryClient();
  const [draftId] = useState(randomUUID);
  const [form, setForm] = useState<FormData>(
    initial
      ? { ...initial, category: initial.category as FormData["category"] }
      : {
          title: "",
          category: "Skills",
          location: "",
          description: "",
          schedule: "",
          cost_kes: 0,
          published: false,
        },
  );
  const [cost, setCost] = useState(String(form.cost_kes));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  async function save() {
    if (busy) return;
    const valid = schema.safeParse({ ...form, cost_kes: cost });
    if (!valid.success) {
      setFeedback(
        valid.error.issues
          .map((i) => `${String(i.path[0])}: ${i.message}`)
          .join("\n"),
      );
      return;
    }
    setBusy(true);
    setFeedback("");
    try {
      const recordId = id === "new" ? draftId : id;
      let result =
        id === "new"
          ? await db()
              .from("programmes")
              .insert({ id: recordId, ...valid.data })
              .select("id")
          : await db()
              .from("programmes")
              .update(valid.data)
              .eq("id", recordId)
              .select("id");
      if (result.error?.code === "23505" && id === "new")
        result = await db()
          .from("programmes")
          .update(valid.data)
          .eq("id", recordId)
          .select("id");
      if (result.error || !result.data?.length) throw result.error;
      await cache.invalidateQueries({ queryKey: ["staff-programmes"] });
      await cache.invalidateQueries({ queryKey: ["programmes"] });
      await cache.invalidateQueries({ queryKey: ["programme", id] });
      await cache.invalidateQueries({ queryKey: ["staff-programme", id] });
      router.back();
    } catch {
      setFeedback(
        "We couldn’t save this programme. Your draft is still here. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        <Copy size={32} strong>
          {id === "new" ? "Create an opportunity." : "Refine this opportunity."}
        </Copy>
        <Field
          label="Programme title"
          value={form.title}
          onChangeText={(v) => set("title", v)}
          maxLength={140}
        />
        <Copy strong>Category</Copy>
        {(["Skills", "Education", "Livelihood"] as const).map((c) => (
          <Button
            key={c}
            secondary={form.category !== c}
            label={c}
            onPress={() => set("category", c)}
          />
        ))}
        <Field
          label="Location or online"
          value={form.location}
          onChangeText={(v) => set("location", v)}
          maxLength={200}
        />
        <Field
          label="What will participants learn?"
          value={form.description}
          onChangeText={(v) => set("description", v)}
          maxLength={10000}
          multiline
        />
        <Field
          label="Schedule and duration"
          value={form.schedule}
          onChangeText={(v) => set("schedule", v)}
          maxLength={500}
        />
        <Field
          label="Cost in KES (0 for free)"
          value={cost}
          onChangeText={setCost}
          keyboardType="number-pad"
          maxLength={8}
        />
        <Card>
          <Copy strong>
            {form.published
              ? "Visible to members"
              : "Draft · only staff can see this"}
          </Copy>
          <Button
            secondary
            label={form.published ? "Keep as draft" : "Publish when saved"}
            onPress={() => set("published", !form.published)}
          />
        </Card>
        {!!feedback && <Copy>{feedback}</Copy>}
        <Button label="Save programme" onPress={save} busy={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
