import React, { useState } from "react";
import { ScrollView } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../session";
import { db } from "../../backend";
import { friendlyError } from "../../community/data";
import { Button, Card, Copy, Field, s } from "../../ui";
export default function Options() {
  const { post, comment, author } = useLocalSearchParams<{
    post: string;
    comment?: string;
    author: string;
  }>();
  const { session } = useSession();
  const cache = useQueryClient();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  if (!session) return <Redirect href="/auth" />;
  const own = author === session.user.id;
  async function action(kind: "delete" | "report" | "block") {
    setBusy(true);
    setMessage("");
    try {
      if (kind === "delete") {
        const { error } = await db()
          .from(comment ? "community_comments" : "community_posts")
          .delete()
          .eq("id", comment ?? post)
          .eq("author_id", session!.user.id);
        if (error) throw error;
      } else if (kind === "block") {
        const { error } = await db()
          .from("community_blocks")
          .upsert(
            { blocker_id: session!.user.id, blocked_id: author },
            { ignoreDuplicates: true },
          );
        if (error) throw error;
      } else {
        const { error } = await db()
          .from("community_reports")
          .insert({
            reporter_id: session!.user.id,
            post_id: post,
            comment_id: comment ?? null,
            reason: reason.trim(),
          });
        if (error) throw error;
        setMessage(
          "Report received. The Amredi team can review it. Your report is not shown to the author.",
        );
        setReason("");
        return;
      }
      await cache.cancelQueries({ queryKey: ["community"] });
      await cache.resetQueries({ queryKey: ["community"] });
      router.replace("/(tabs)");
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.page}
    >
      <Copy strong size={25}>
        {own ? "Manage your content" : "Keep your circle comfortable"}
      </Copy>
      {own ? (
        <>
          {!comment && (
            <Button
              secondary
              label="Edit post"
              disabled={busy}
              onPress={() =>
                router.replace({
                  pathname: "/community/compose",
                  params: { id: post },
                })
              }
            />
          )}
          <Card>
            <Copy>
              Deleting removes this {comment ? "comment" : "post"} from the
              community.
            </Copy>
            <Button
              secondary
              label={confirm ? "Confirm delete" : "Delete"}
              busy={busy}
              onPress={() =>
                confirm ? void action("delete") : setConfirm(true)
              }
            />
          </Card>
        </>
      ) : (
        <>
          <Card>
            <Copy strong>Report this {comment ? "comment" : "post"}</Copy>
            <Field
              label="What should the team know?"
              multiline
              maxLength={1000}
              value={reason}
              onChangeText={setReason}
              editable={!busy}
            />
            <Button
              label="Send report"
              disabled={reason.trim().length < 5}
              busy={busy}
              onPress={() => void action("report")}
            />
          </Card>
          <Card>
            <Copy strong>Block this member</Copy>
            <Copy muted>
              You won’t see each other’s community content or interact on new
              posts. Existing assigned support conversations are managed
              separately in Messages.
            </Copy>
            <Button
              secondary
              label={confirm ? "Confirm block" : "Block member"}
              busy={busy}
              onPress={() =>
                confirm ? void action("block") : setConfirm(true)
              }
            />
          </Card>
        </>
      )}
      {!!message && <Copy>{message}</Copy>}
    </ScrollView>
  );
}
