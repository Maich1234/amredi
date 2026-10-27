import React from "react";
import { View } from "react-native";
import { Button, Copy, s } from "./ui";
export function ScrollAccess({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: boolean;
  retry: () => void;
}) {
  return (
    <View style={s.page}>
      <Copy>
        {pending
          ? "Checking access…"
          : error
            ? "Access could not be checked."
            : "This workspace needs an approved account."}
      </Copy>
      {error && <Button label="Try again" onPress={retry} />}
    </View>
  );
}
