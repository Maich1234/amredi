import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { z } from "zod";
import { db, supabase } from "../backend";
import { Copy, Button, Field, Card, s } from "../ui";
const credentials = z.object({
  email: z.email(),
  password: z.string().min(10, "Use at least 10 characters."),
});
export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    const valid = credentials.safeParse({ email: email.trim(), password });
    if (!valid.success) {
      setMessage(valid.error.issues[0].message);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = signup
        ? await db().auth.signUp(valid.data)
        : await db().auth.signInWithPassword(valid.data);
      if (error) throw error;
      if (data.session) router.replace("/(tabs)");
      else
        setMessage("Check your email to confirm your account, then sign in.");
    } catch {
      setMessage(
        "We could not complete that request. Check your details and connection, then try again.",
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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.page}
      >
        <Copy size={34} strong>
          {signup ? "You belong here." : "Welcome back."}
        </Copy>
        <Copy muted>
          {signup
            ? "One small step toward your next chapter."
            : "Your journey continues, at your pace."}
        </Copy>
        {!supabase && (
          <Card>
            <Copy strong>Connection setup needed</Copy>
            <Copy muted>
              Amredi’s Supabase connection has not been configured for this
              build.
            </Copy>
          </Card>
        )}
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={signup ? "new-password" : "current-password"}
        />
        {signup && (
          <Copy size={13} muted>
            Use at least 10 characters. We’ll email you to verify your account.
          </Copy>
        )}
        {!!message && <Copy>{message}</Copy>}
        <Button
          label={signup ? "Create account" : "Sign in"}
          onPress={submit}
          busy={busy}
          disabled={!supabase}
        />
        <Button
          secondary
          label={
            signup ? "Already a member? Sign in" : "New here? Create an account"
          }
          onPress={() => {
            setSignup(!signup);
            setMessage("");
          }}
        />
        {!signup && (
          <Button
            secondary
            label="Forgot password?"
            onPress={() => router.push("/recover")}
            busy={busy}
            disabled={!supabase}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
