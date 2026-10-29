# Dependency security gate

The 8a45a5d workflow completed lint, type checking, database regression checks and both production exports. Its final npm audit step failed on high-severity transitive dependencies in Expo tooling: node-forge <=1.4.0 and Zod <4.6.6.

The fix stays on Expo SDK 58 (58.0.21), pins node-forge 1.4.2 and scopes the Zod 4.6.7 override to @expo/cli. The app already uses Zod 4.6.7. No audit force downgrade, suppression or severity threshold change is used.

Expo CLI 58.1.17 still declares Zod 3. The override is a temporary compatibility measure: scripts/check-expo-validation.cjs loads the installed upstream plugin/output/MCP schemas and checks valid and invalid commands, parameters and output. CI runs this alongside the existing checks. Remove the override once Expo declares a patched compatible version itself; re-run the compatibility check and exports whenever changing it.

The dependency audit after this change reports zero high/critical issues and seven low-severity warnings in Expo configuration tooling (including deepmerge). These warnings remain visible. This is not a claim that every dependency is vulnerability-free or that device testing has completed.
