// Exercise upstream Expo schemas against the patched Zod override, including
// plugin parameters and command output used by CLI/MCP development extensions.
const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const mobile = path.join(__dirname, "../apps/mobile");
const expoPackage = require.resolve("expo/package.json", { paths: [mobile] });
const expoRequire = createRequire(expoPackage);
const cliPackage = expoRequire.resolve("@expo/cli/package.json");
const cliRequire = createRequire(cliPackage);
const cliRoot = path.dirname(cliPackage);
const { PluginSchema, DevToolsPluginOutputSchema } = require(
  path.join(cliRoot, "build/src/start/server/DevToolsPlugin.schema.js"),
);
const { createMCPDevToolsExtensionSchema } = require(
  path.join(
    cliRoot,
    "build/src/start/server/createMCPDevToolsExtensionSchema.js",
  ),
);
assert.equal(cliRequire("zod/package.json").version, "4.6.7");
assert.equal(cliRequire("node-forge/package.json").version, "1.4.2");
const plugin = PluginSchema.parse({
  packageName: "amredi-tooling-fixture",
  packageRoot: "/fixture",
  cliExtensions: {
    description: "Compatibility fixture",
    entryPoint: "fixture.js",
    commands: [
      {
        name: "inspect",
        title: "Inspect",
        environments: ["cli", "mcp"],
        parameters: [
          { name: "text", type: "text" },
          { name: "count", type: "number" },
          { name: "confirm", type: "confirm" },
        ],
      },
    ],
  },
});
assert.equal(
  PluginSchema.safeParse({ ...plugin, packageName: "" }).success,
  false,
);
const schema = createMCPDevToolsExtensionSchema(plugin);
assert.equal(
  schema.safeParse({
    command: "inspect",
    text: "hello",
    count: 3,
    confirm: true,
  }).success,
  true,
);
for (const invalid of [
  { command: "unknown" },
  { command: "inspect", count: "3" },
  { command: "inspect", confirm: "yes" },
  { command: "inspect", unexpected: true },
]) {
  assert.equal(schema.safeParse(invalid).success, false);
}
assert.equal(
  DevToolsPluginOutputSchema.safeParse([
    { type: "text", text: "Ready", level: "info" },
  ]).success,
  true,
);
assert.equal(
  DevToolsPluginOutputSchema.safeParse([
    { type: "image", url: "https://example.invalid/test.png" },
  ]).success,
  true,
);
assert.equal(
  DevToolsPluginOutputSchema.safeParse([
    { type: "text", text: "Invalid", level: "unknown" },
  ]).success,
  false,
);
assert.equal(
  DevToolsPluginOutputSchema.safeParse([{ type: "image", url: "not-a-url" }])
    .success,
  false,
);
console.log(
  "PASS: patched Expo tooling schemas preserve valid input/output and reject invalid commands, parameters and output.",
);
