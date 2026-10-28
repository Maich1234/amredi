import React, { useState, useRef } from "react";
import {
  ScrollView,
  Image,
  Switch,
  View,
  ActivityIndicator,
} from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../session";
import { db } from "../../backend";
import {
  useCommunityProfile,
  usePost,
  Post,
  friendlyError,
} from "../../community/data";
import { choosePhoto, uploadPhoto, PrivateImage } from "../../community/media";
import { Button, Copy, Field, s } from "../../ui";
function Editor({ post, user }: { post?: Post | null; user: string }) {
  const cache = useQueryClient();
  const [id] = useState(() => post?.id ?? randomUUID());
  const [body, setBody] = useState(post?.body ?? "");
  const [alt, setAlt] = useState(post?.image_alt ?? "");
  const [photo, setPhoto] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [comments, setComments] = useState(post?.comments_enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const uploaded = useRef<{ uri: string; path: string } | null>(null);
  async function save() {
    if (!body.trim()) {
      setError("Write a little something first.");
      return;
    }
    if ((photo || (!removed && post?.image_path)) && !alt.trim()) {
      setError(
        "Add a short photo description for people using screen readers.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (photo && uploaded.current?.uri !== photo)
        uploaded.current = {
          uri: photo,
          path: await uploadPhoto(photo, user, "post"),
        };
      const values = {
        body: body.trim(),
        image_path: removed
          ? null
          : (uploaded.current?.path ?? post?.image_path ?? null),
        image_alt: alt.trim(),
        comments_enabled: comments,
      };
      const result = post
        ? await db()
            .from("community_posts")
            .update(values)
            .eq("id", id)
            .eq("author_id", user)
            .select("id")
            .single()
        : await db()
            .from("community_posts")
            .insert({ id, author_id: user, ...values });
      if (result.error && !(result.error.code === "23505" && !post))
        throw result.error;
      if (post?.image_path && post.image_path !== values.image_path)
        await db().storage.from("community").remove([post.image_path]);
      await cache.invalidateQueries({ queryKey: ["community"] });
      router.replace("/(tabs)");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function pick() {
    try {
      const p = await choosePhoto();
      if (p) {
        setPhoto(p);
        setRemoved(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo could not be opened.");
    }
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.page}
    >
      <Copy strong size={26}>
        {post ? "Edit your post" : "Share a little of your world"}
      </Copy>
      <Copy muted size={14}>
        Visible to signed-in community members. Avoid sharing phone numbers,
        addresses or anyone else’s story without their permission.
      </Copy>
      <Field
        label="Your post"
        multiline
        maxLength={2000}
        value={body}
        onChangeText={setBody}
        editable={!busy}
        style={{ minHeight: 160, padding: 16, textAlignVertical: "top" }}
      />
      <Copy muted size={12}>
        {body.length}/2000
      </Copy>
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 18 }}
          accessibilityLabel="Selected post photo"
        />
      ) : !removed && post?.image_path ? (
        <PrivateImage path={post.image_path} label={alt} />
      ) : null}
      <Button
        secondary
        label="Add or change photo"
        onPress={pick}
        disabled={busy}
      />
      {(photo || post?.image_path) && !removed && (
        <>
          <Field
            label="Photo description"
            maxLength={200}
            value={alt}
            onChangeText={setAlt}
            editable={!busy}
          />
          <Button
            secondary
            label="Remove photo"
            disabled={busy}
            onPress={() => {
              setRemoved(true);
              setPhoto(null);
            }}
          />
        </>
      )}
      <View style={s.row}>
        <Copy>Allow comments</Copy>
        <Switch
          accessibilityLabel="Allow comments"
          disabled={busy}
          value={comments}
          onValueChange={setComments}
        />
      </View>
      {!!error && <Copy>{error}</Copy>}
      <Button
        label={post ? "Save changes" : "Publish post"}
        onPress={save}
        busy={busy}
      />
    </ScrollView>
  );
}
export default function Compose() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useSession();
  const profile = useCommunityProfile();
  const post = usePost(id ?? "");
  if (!session) return <Redirect href="/auth" />;
  if (profile.isPending || (id && post.isPending)) return <ActivityIndicator />;
  if (profile.isError || (id && post.isError))
    return (
      <View style={s.page}>
        <Copy>We couldn’t load the editor.</Copy>
        <Button
          label="Retry"
          onPress={() => {
            void profile.refetch();
            if (id) void post.refetch();
          }}
        />
      </View>
    );
  if (!profile.data) return <Redirect href="/community/edit-profile" />;
  if (id && (!post.data || post.data.author_id !== session.user.id))
    return <Copy>This post is unavailable.</Copy>;
  return <Editor user={session.user.id} post={id ? post.data : undefined} />;
}
