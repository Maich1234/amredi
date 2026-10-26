import React from "react";
import {
  Text,
  Pressable,
  View,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TextInputProps,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ReduceMotion,
} from "react-native-reanimated";
import { useTheme } from "./theme";
export function Copy({
  children,
  size = 16,
  muted = false,
  strong = false,
}: {
  children: React.ReactNode;
  size?: number;
  muted?: boolean;
  strong?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        color: muted ? colors.muted : colors.text,
        fontSize: size,
        lineHeight: size * 1.45,
        fontWeight: strong ? "700" : "400",
      }}
    >
      {children}
    </Text>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        s.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  busy = false,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));
  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy || disabled, busy }}
        disabled={busy || disabled}
        onPress={onPress}
        onPressIn={() => {
          scale.set(
            withTiming(0.98, {
              duration: 90,
              reduceMotion: ReduceMotion.System,
            }),
          );
        }}
        onPressOut={() => {
          scale.set(
            withTiming(1, {
              duration: 120,
              reduceMotion: ReduceMotion.System,
            }),
          );
        }}
        style={[
          s.button,
          {
            backgroundColor: secondary ? colors.soft : colors.pink,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={secondary ? colors.pink : colors.bg} />
        ) : (
          <Text
            style={{
              color: secondary ? colors.pink : colors.bg,
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Copy size={14} strong>
        {label}
      </Copy>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[
          s.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.line,
          },
        ]}
        {...props}
      />
    </View>
  );
}
export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <Copy size={21} strong>
        {title}
      </Copy>
      <Copy muted>{body}</Copy>
    </Card>
  );
}
export const s = StyleSheet.create({
  card: { padding: 22, borderRadius: 24, borderWidth: 1, gap: 12 },
  button: {
    minHeight: 52,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 15,
    minHeight: 54,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  page: {
    padding: 24,
    gap: 22,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 660,
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
