import React from "react";
import { FlatList, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { conversations } from "../../conversations";
import { Button, Card, Copy, Empty, s } from "../../ui";
export default function Messages() {
  const query = useQuery({
    queryKey: ["conversations"],
    queryFn: conversations,
  });
  const { refetch } = query;
  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  return (
    <FlatList
      contentContainerStyle={s.page}
      data={query.data ?? []}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 16 }}>
          <Copy size={34} strong>
            A space to connect.
          </Copy>
          <Copy muted>
            Private conversations with your assigned support network.
          </Copy>
        </View>
      }
      renderItem={({ item }) => (
        <Card>
          <Copy strong size={22}>
            {item.mentorships.mentors?.display_name || "Your mentor"}
          </Copy>
          <Copy muted>
            {item.blocked_by
              ? "Messaging paused"
              : item.mentorships.status === "active"
                ? "Your mentorship conversation"
                : "Mentorship closed · history available"}
          </Copy>
          <Button
            secondary
            label="Open conversation"
            onPress={() =>
              router.push({ pathname: "/chat/[id]", params: { id: item.id } })
            }
          />
        </Card>
      )}
      ListEmptyComponent={
        query.isPending ? (
          <Copy>Loading conversations…</Copy>
        ) : query.isError ? (
          <Card>
            <Copy>We couldn’t load your conversations.</Copy>
            <Button label="Try again" onPress={() => void query.refetch()} />
          </Card>
        ) : (
          <Empty
            title="Your conversations will start here."
            body="When the team assigns your mentor and opens a conversation, it will appear here."
          />
        )
      }
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    />
  );
}
