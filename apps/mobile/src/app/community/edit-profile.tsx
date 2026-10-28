import React, { useState, useRef } from "react";
import { ScrollView, View, Image, ActivityIndicator } from "react-native";
import { Redirect, router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../session";
import { useProfile } from "../../queries";
import { db } from "../../backend";
import {
  CommunityProfile,
  useCommunityProfile,
  friendlyError,
} from "../../community/data";
import { choosePhoto, uploadPhoto, PrivateImage } from "../../community/media";
import { Button, Copy, Field, s } from "../../ui";
function Editor({
  initial,
  name: suggestedName,
  user,
}: {
  initial: CommunityProfile | null;
  name: string;
  user: string;
}) {
  const cache = useQueryClient();
  const [name, setName] = useState(initial?.display_name ?? suggestedName);
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [interests, setInterests] = useState(initial?.interests ?? "");
  const [role, setRole] = useState(initial?.role_intent ?? "mother");
  const [photo, setPhoto] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const uploaded = useRef<{ uri: string; path: string } | null>(null);
  async function pick() {
    try {
      const uri = await choosePhoto(true);
      if (uri) {
        setPhoto(uri);
        setRemoved(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo could not be opened.");
    }
  }
  async function save() {
    if (!name.trim()) {
      setError("Add a display name first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (photo && uploaded.current?.uri !== photo)
        uploaded.current = {
          uri: photo,
          path: await uploadPhoto(photo, user, "avatar"),
        };
      const avatar = removed
        ? null
        : (uploaded.current?.path ?? initial?.avatar_path ?? null);
      const { error } = await db()
        .from("community_profiles")
        .upsert({
          id: user,
          display_name: name.trim(),
          bio: bio.trim(),
          interests: interests.trim(),
          role_intent: role,
          avatar_path: avatar,
        });
      if (error) throw error;
      if (initial?.avatar_path && initial.avatar_path !== avatar)
        await db().storage.from("community").remove([initial.avatar_path]);
      await cache.invalidateQueries({ queryKey: ["community"] });
      router.back();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.page}
    >
      <Copy strong size={26}>
        A little about you
      </Copy>
      <Copy muted>
        Your photo, display name, bio and interests are visible to signed-in
        community members. Your private support details stay separate.
      </Copy>
      <View style={{ alignItems: "center", gap: 12 }}>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ width: 96, height: 96, borderRadius: 48 }}
            accessibilityLabel="Selected profile photo"
          />
        ) : (
          <PrivateImage
            avatar
            size={96}
            path={removed ? null : (initial?.avatar_path ?? null)}
            label={name || "You"}
          />
        )}
        <Button
          secondary
          label="Choose profile photo"
          disabled={busy}
          onPress={pick}
        />
        {(photo || initial?.avatar_path) && !removed && (
          <Button
            secondary
            label="Remove photo"
            disabled={busy}
            onPress={() => {
              setPhoto(null);
              setRemoved(true);
            }}
          />
        )}
      </View>
      <Field
        label="Display name"
        maxLength={60}
        value={name}
        onChangeText={setName}
        editable={!busy}
      />
      <Field
        label="Bio · optional"
        multiline
        maxLength={300}
        value={bio}
        onChangeText={setBio}
        editable={!busy}
      />
      <Field
        label="Skills and interests · optional"
        maxLength={160}
        value={interests}
        onChangeText={setInterests}
        editable={!busy}
      />
      <Copy strong>I’m here as a…</Copy>
      {[
        ["mother", "Mother"],
        ["mentor", "Mentor"],
        ["trainer", "Skills trainer"],
      ].map(([v, l]) => (
        <Button
          key={v}
          secondary={role !== v}
          label={l}
          disabled={busy}
          onPress={() => setRole(v)}
        />
      ))}
      <Copy muted size={13}>
        Choosing mentor or trainer expresses your interest. It does not grant
        approved status, assignments or staff access.
      </Copy>
      {!!error && <Copy>{error}</Copy>}
      <Button label="Save community profile" busy={busy} onPress={save} />
    </ScrollView>
  );
}
export default function EditProfile() {
  const { session } = useSession();
  const profile = useCommunityProfile();
  const privateProfile = useProfile();
  if (!session) return <Redirect href="/auth" />;
  if (profile.isPending || privateProfile.isPending)
    return <ActivityIndicator />;
  if (profile.isError)
    return (
      <View style={s.page}>
        <Copy>We couldn’t load your profile.</Copy>
        <Button label="Try again" onPress={() => void profile.refetch()} />
      </View>
    );
  return (
    <Editor
      initial={profile.data ?? null}
      name={privateProfile.data?.display_name ?? ""}
      user={session.user.id}
    />
  );
}
