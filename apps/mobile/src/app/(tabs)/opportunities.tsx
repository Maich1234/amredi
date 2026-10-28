import React, { useState } from "react";
import { FlatList, View, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTheme } from "../../theme";
import { db, Programme } from "../../backend";
import { Button, Card, Copy, Empty, s } from "../../ui";
const PAGE = 15;
export default function Opportunities() {
  const { colors } = useTheme();
  const [category, setCategory] = useState("All");
  const query = useInfiniteQuery({
    queryKey: ["programmes", category],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let request = db()
        .from("programmes")
        .select("id,title,category,location,description,schedule,cost_kes")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .order("id")
        .range(pageParam, pageParam + PAGE - 1);
      if (category !== "All") request = request.eq("category", category);
      const { data, error } = await request;
      if (error) throw error;
      return data as Programme[];
    },
    getNextPageParam: (last, pages) =>
      last.length === PAGE ? pages.length * PAGE : undefined,
  });
  return (
    <FlatList
      contentContainerStyle={s.page}
      data={query.data?.pages.flat() ?? []}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View style={{ gap: 20, marginBottom: 20 }}>
          <Copy size={28} strong>
            Room to grow.
          </Copy>
          <Copy muted>Find a practical next step that fits your life.</Copy>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {["All", "Skills", "Education", "Livelihood"].map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityState={{ selected: c === category }}
                onPress={() => setCategory(c)}
                style={{
                  minHeight: 48,
                  paddingHorizontal: 18,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: c === category ? colors.pink : colors.line,
                  backgroundColor:
                    c === category ? colors.soft : colors.surface,
                  justifyContent: "center",
                }}
              >
                <Copy strong size={14}>
                  {c}
                </Copy>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ marginBottom: 16 }}>
          <Card>
            <Copy size={12} strong>
              {item.category.toUpperCase()} · {item.location}
            </Copy>
            <Copy size={24} strong>
              {item.title}
            </Copy>
            <Copy muted>{item.schedule}</Copy>
            <Copy strong>
              {item.cost_kes === 0
                ? "Free to participate"
                : `KES ${item.cost_kes.toLocaleString()}`}
            </Copy>
            <Button
              secondary
              label="View opportunity"
              onPress={() =>
                router.push({
                  pathname: "/programme/[id]",
                  params: { id: item.id },
                })
              }
            />
          </Card>
        </View>
      )}
      ListEmptyComponent={
        query.isPending ? (
          <Copy muted>Finding opportunities…</Copy>
        ) : query.isError ? (
          <Card>
            <Copy>We couldn’t load opportunities.</Copy>
            <Button label="Try again" onPress={() => void query.refetch()} />
          </Card>
        ) : (
          <Empty
            title="More possibilities are on the way."
            body="Approved programmes will appear here when partners publish them."
          />
        )
      }
      ListFooterComponent={
        query.hasNextPage ? (
          <Button
            busy={query.isFetchingNextPage}
            secondary
            label="Show more"
            onPress={() => void query.fetchNextPage()}
          />
        ) : undefined
      }
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => void query.refetch()}
    />
  );
}
