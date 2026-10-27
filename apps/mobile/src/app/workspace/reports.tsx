import React, { useState } from "react";
import { FlatList, View } from "react-native";
import { Redirect } from "expo-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "../../backend";
import { useAccess } from "../../access";
import { useSession } from "../../session";
import { ScrollAccess } from "../../access-ui";
import { Button, Card, Copy, Empty, Field, s } from "../../ui";
type Report = {
  id: string;
  reporter_id: string;
  reason: string;
  message_excerpt: string;
  review_state: string;
  outcome: string;
  created_at: string;
};
export default function Reports() {
  const { session } = useSession();
  const access = useAccess();
  const [state, setState] = useState("open");
  const query = useInfiniteQuery({
    queryKey: ["report-queue", state],
    enabled: !!access.data?.staff,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await db()
        .from("message_reports")
        .select(
          "id,reporter_id,reason,message_excerpt,review_state,outcome,created_at",
        )
        .eq("review_state", state)
        .order("created_at")
        .order("id")
        .range(pageParam, pageParam + 19);
      if (error) throw error;
      return data as Report[];
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
  return (
    <FlatList
      contentContainerStyle={s.page}
      data={query.data?.pages.flat() ?? []}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          <Copy size={32} strong>
            Make support a safer space.
          </Copy>
          <Copy muted>
            Review the reported message and reason. Only the reported excerpt is
            available here.
          </Copy>
          {["open", "reviewed", "resolved", "dismissed"].map((v) => (
            <Button
              key={v}
              secondary={state !== v}
              label={v.charAt(0).toUpperCase() + v.slice(1)}
              onPress={() => setState(v)}
            />
          ))}
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ marginTop: 16 }}>
          <ReviewCard
            report={item}
            own={item.reporter_id === session.user.id}
          />
        </View>
      )}
      ListEmptyComponent={
        query.isPending ? (
          <Copy>Loading reports…</Copy>
        ) : query.isError ? (
          <Button label="Retry reports" onPress={() => void query.refetch()} />
        ) : (
          <Empty
            title="No reports in this queue."
            body="Member reports will appear here for the team to review."
          />
        )
      }
      ListFooterComponent={
        query.hasNextPage ? (
          <Button
            label="More reports"
            busy={query.isFetchingNextPage}
            onPress={() => void query.fetchNextPage()}
          />
        ) : undefined
      }
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => void query.refetch()}
    />
  );
}
function ReviewCard({ report, own }: { report: Report; own: boolean }) {
  const cache = useQueryClient();
  const [outcome, setOutcome] = useState("");
  const [closing, setClosing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function update(state: string) {
    if (busy) return;
    setBusy(true);
    setFeedback("");
    try {
      const { data, error } = await db()
        .from("message_reports")
        .update({
          review_state: state,
          outcome: state === "reviewed" ? "" : outcome.trim(),
        })
        .eq("id", report.id)
        .eq("review_state", report.review_state)
        .select("id");
      if (error || !data?.length) throw error;
      await cache.invalidateQueries({ queryKey: ["report-queue"] });
      await cache.invalidateQueries({ queryKey: ["audit-events"] });
    } catch {
      setFeedback("The report could not be updated. Refresh and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Copy strong>
        Reported {new Date(report.created_at).toLocaleString()}
      </Copy>
      <Copy size={13} muted>
        Reported message
      </Copy>
      <Copy>{report.message_excerpt}</Copy>
      <Copy size={13} muted>
        Reason
      </Copy>
      <Copy>{report.reason}</Copy>
      {report.outcome && (
        <>
          <Copy strong>Outcome shared with the reporter</Copy>
          <Copy>{report.outcome}</Copy>
        </>
      )}
      {own ? (
        <Copy muted>Another staff member must review your report.</Copy>
      ) : report.review_state === "open" ? (
        <Button
          label="Begin review"
          onPress={() => void update("reviewed")}
          busy={busy}
        />
      ) : report.review_state === "reviewed" ? (
        <>
          <Field
            label="Outcome (visible to the reporter)"
            value={outcome}
            onChangeText={setOutcome}
            maxLength={1000}
            multiline
          />
          <Button
            label="Resolve report"
            onPress={() => setClosing("resolved")}
            disabled={busy || outcome.trim().length < 5}
          />
          <Button
            secondary
            label="Dismiss report"
            onPress={() => setClosing("dismissed")}
            disabled={busy || outcome.trim().length < 5}
          />
          {closing && (
            <>
              <Copy strong>
                Confirm {closing === "resolved" ? "resolution" : "dismissal"}?
                The outcome will be shared with the reporter.
              </Copy>
              <Button
                label="Confirm report closure"
                onPress={() => void update(closing)}
                busy={busy}
              />
              <Button
                secondary
                label="Keep reviewing"
                onPress={() => setClosing(null)}
                disabled={busy}
              />
            </>
          )}
        </>
      ) : null}
      {!!feedback && <Copy>{feedback}</Copy>}
    </Card>
  );
}
