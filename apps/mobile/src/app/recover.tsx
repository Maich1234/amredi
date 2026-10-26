import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { z } from "zod";
import { db, supabase } from "../backend";
import { Button, Copy, Field, s } from "../ui";
export default function Recover() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<"email" | "code" | "password" | "done">(
    "email",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function next() {
    if (busy) return;
    setMessage("");
    setBusy(true);
    try {
      if (stage === "email") {
        if (!z.email().safeParse(email.trim()).success) {
          setMessage("Enter a valid email address.");
          return;
        }
        const { error } = await db().auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        setStage("code");
        setMessage("If this account exists, a recovery code is on its way.");
      } else if (stage === "code") {
        if (!/^\d{6,10}$/.test(token.trim())) {
          setMessage("Enter the code from your email.");
          return;
        }
        const { error } = await db().auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: "recovery",
        });
        if (error) throw error;
        setToken("");
        setStage("password");
      } else if (stage === "password") {
        if (password.length < 10 || password.length > 128) {
          setMessage("Use between 10 and 128 characters.");
          return;
        }
        const { error } = await db().auth.updateUser({ password });
        if (error) throw error;
        setPassword("");
        setStage("done");
      }
    } catch {
      setMessage(
        stage === "code"
          ? "That code could not be verified. Check it or request another."
          : "We couldn’t complete that request. Check your connection and try again.",
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
        <Copy size={34} strong>
          {stage === "done"
            ? "You’re back in control."
            : "A fresh start for your password."}
        </Copy>
        <Copy muted>
          {stage === "email"
            ? "We’ll send a one-time code to your email."
            : stage === "code"
              ? "Keep your code private. Enter it here to verify it’s you."
              : stage === "password"
                ? "Choose a strong password you haven’t used elsewhere."
                : "Your new password is saved."}
        </Copy>
        {stage === "email" && (
          <Field
            label="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
        )}
        {stage === "code" && (
          <Field
            label="Recovery code"
            value={token}
            onChangeText={setToken}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={10}
          />
        )}{" "}
        {stage === "password" && (
          <Field
            label="New password"
            value={password}
            onChangeText={setPassword}
            maxLength={128}
            secureTextEntry
            autoComplete="new-password"
          />
        )}
        {!!message && <Copy>{message}</Copy>}
        {stage === "done" ? (
          <Button
            label="Continue my journey"
            onPress={() => router.replace("/(tabs)")}
          />
        ) : (
          <Button
            label={
              stage === "email"
                ? "Send recovery code"
                : stage === "code"
                  ? "Verify code"
                  : "Save new password"
            }
            onPress={next}
            busy={busy}
            disabled={!supabase}
          />
        )}{" "}
        {stage === "code" && (
          <Button
            secondary
            label="Use another email or request a new code"
            disabled={busy}
            onPress={() => {
              setStage("email");
              setToken("");
              setMessage("");
            }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
