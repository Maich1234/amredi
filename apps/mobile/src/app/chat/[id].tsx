import React, { useCallback, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, View } from "react-native";
import { Redirect, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { db } from "../../backend";
import { useSession } from "../../session";
import { Conversation, conversationFields } from "../../conversations";
import { useTheme } from "../../theme";
import { Button, Card, Copy, Field } from "../../ui";
type Message = {
  id: number;
  sender_id: string;
  body: string;
  created_at: string;
};
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { colors } = useTheme();
  const cache = useQueryClient();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [retry, setRetry] = useState<{ body: string; nonce: string } | null>(
    null,
  );
  const [reportId, setReportId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const conversation = useQuery({
    queryKey: ["conversation", id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await db()
        .from("conversations")
        .select(conversationFields)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Conversation;
    },
  });
  const messages = useInfiniteQuery({
    queryKey: ["messages", id],
    enabled: !!session,
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      let request = db()
        .from("messages")
        .select("id,sender_id,body,created_at")
        .eq("conversation_id", id)
        .order("id", { ascending: false })
        .limit(30);
      if (pageParam !== null) request = request.lt("id", pageParam);
      const { data, error } = await request;
      if (error) throw error;
      return data as Message[];
    },
    getNextPageParam: (last) =>
      last.length === 30 ? last[last.length - 1].id : undefined,
  });
  const userId = session?.user.id;
  const refetchConversation = conversation.refetch;
  const refetchMessages = messages.refetch;
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void refetchConversation();
      void refetchMessages();
      const channel = db()
        .channel(`conversation:${id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${id}`,
          },
          () => {
            void cache.invalidateQueries({ queryKey: ["messages", id] });
          },
        )
        .subscribe();
      return () => {
        void db().removeChannel(channel);
      };
    }, [id, userId, cache, refetchConversation, refetchMessages]),
  );
  if (!session) return <Redirect href="/auth" />;
  const paused =
    !!conversation.data?.blocked_by ||
    conversation.data?.mentorships.status !== "active";
  async function send() {
    const text = body.trim();
    if (busy || !text || text.length > 4000) return;
    const nonce = retry?.body === text ? retry.nonce : randomUUID();
    setRetry({ body: text, nonce });
    setBusy(true);
    setFeedback("");
    try {
      const { error } = await db().from("messages").insert({
        conversation_id: id,
        sender_id: session!.user.id,
        body: text,
        client_nonce: nonce,
      });
      if (error && error.code !== "23505") throw error;
      setBody("");
      setRetry(null);
      await cache.invalidateQueries({ queryKey: ["messages", id] });
    } catch {
      setFeedback(
        "Message not sent. Your text is still here. Try again, or wait a moment if you’ve sent several messages.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function block() {
    if (actionBusy) return;
    setActionBusy(true);
    setFeedback("");
    try {
      const { data, error } = await db()
        .from("conversations")
        .update({
          blocked_by: conversation.data?.blocked_by ? null : session!.user.id,
        })
        .eq("id", id)
        .select("id");
      if (error || !data?.length) throw error;
      await conversation.refetch();
      await cache.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      setFeedback("We couldn’t update this conversation. Please try again.");
    } finally {
      setActionBusy(false);
    }
  }
  async function report() {
    if (actionBusy || !reportId || reason.trim().length < 5) return;
    setActionBusy(true);
    try {
      const { error } = await db().from("message_reports").insert({
        reporter_id: session!.user.id,
        message_id: reportId,
        reason: reason.trim(),
      });
      if (error && error.code !== "23505") throw error;
      setReportId(null);
      setReason("");
      setFeedback(
        "Report received for review by the Amredi team. This inbox is not monitored as an emergency service.",
      );
    } catch {
      setFeedback("We couldn’t send your report. Please try again.");
    } finally {
      setActionBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={{ paddingHorizontal: 24, paddingVertical: 12, gap: 8 }}>
        <Copy strong size={20}>
          {conversation.data?.mentorships.mentors?.display_name ||
            "Private conversation"}
        </Copy>
        {conversation.isError ? (
          <Button
            secondary
            label="Retry conversation"
            onPress={() => void conversation.refetch()}
          />
        ) : (
          conversation.data && (
            <Button
              secondary
              busy={actionBusy}
              disabled={
                !!conversation.data.blocked_by &&
                conversation.data.blocked_by !== session.user.id
              }
              label={
                conversation.data.blocked_by === session.user.id
                  ? "Unblock conversation"
                  : conversation.data.blocked_by
                    ? "Paused by the other participant"
                    : "Block conversation"
              }
              onPress={block}
            />
          )
        )}
      </View>
      <FlatList
        inverted
        data={messages.data?.pages.flat() ?? []}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf:
                item.sender_id === session.user.id ? "flex-end" : "flex-start",
              maxWidth: "90%",
              backgroundColor:
                item.sender_id === session.user.id
                  ? colors.soft
                  : colors.surface,
              padding: 16,
              borderRadius: 20,
              gap: 7,
            }}
          >
            <Copy>{item.body}</Copy>
            <Copy size={11} muted>
              {new Date(item.created_at).toLocaleString()}
            </Copy>
            {item.sender_id !== session.user.id && (
              <Button
                secondary
                label="Report message"
                onPress={() => {
                  setReportId(item.id);
                  setReason("");
                }}
              />
            )}
          </View>
        )}
        ListEmptyComponent={
          <Copy muted>
            {messages.isPending
              ? "Loading conversation…"
              : messages.isError
                ? "Messages could not be loaded."
                : "Your conversation starts here."}
          </Copy>
        }
        ListFooterComponent={
          messages.hasNextPage ? (
            <Button
              secondary
              label="Earlier messages"
              busy={messages.isFetchingNextPage}
              onPress={() => void messages.fetchNextPage()}
            />
          ) : undefined
        }
      />
      <View style={{ padding: 16, gap: 10 }}>
        {messages.isError && (
          <Button
            secondary
            label="Retry messages"
            onPress={() => void messages.refetch()}
          />
        )}{" "}
        {!!feedback && <Copy size={13}>{feedback}</Copy>}
        {reportId ? (
          <Card>
            <Field
              label="What happened?"
              value={reason}
              onChangeText={setReason}
              maxLength={1000}
              multiline
            />
            <Button
              label="Send report"
              onPress={report}
              busy={actionBusy}
              disabled={reason.trim().length < 5}
            />
            <Button
              secondary
              label="Cancel report"
              onPress={() => setReportId(null)}
            />
          </Card>
        ) : paused ? (
          <Copy muted>Messaging is paused for this conversation.</Copy>
        ) : (
          <>
            <Field
              label="Your message"
              value={body}
              onChangeText={setBody}
              maxLength={4000}
              multiline
              editable={!busy}
              placeholder="Write a message…"
            />
            <Button
              label="Send message"
              onPress={send}
              busy={busy}
              disabled={!body.trim() || conversation.isPending}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
