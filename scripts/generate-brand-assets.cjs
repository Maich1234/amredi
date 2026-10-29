// Compile the scalable Amredi mark into native and browser icon assets.
// `sharp` is also used by Expo's image tooling. No runtime dependency is added.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require(
  require.resolve("sharp", {
    paths: [
      path.join(__dirname, "../apps/mobile"),
      process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || process.cwd(),
    ],
  }),
);
const assets = path.join(__dirname, "../apps/mobile/assets");
const mark = fs.readFileSync(path.join(assets, "amredi-mark.svg"), "utf8");
const contents = mark
  .replace(/<title>.*?<\/title>/, "")
  .replace(/^<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");
function svg({
  size = 1024,
  extent = 620,
  color = "#AD346D",
  background,
} = {}) {
  const offset = (size - extent) / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ""}<svg x="${offset}" y="${offset}" width="${extent}" height="${extent}" viewBox="10 0 108 132" fill="${color}">${contents}</svg></svg>`,
  );
}
(async () => {
  for (const [name, options] of [
    ["icon.png", { background: "#FFFFFF", extent: 690 }],
    ["android-icon-foreground.png", { extent: 620 }],
    ["android-icon-monochrome.png", { extent: 620, color: "#FFFFFF" }],
    ["splash-icon.png", { extent: 720 }],
    ["splash-icon-dark.png", { extent: 720, color: "#F29DC4" }],
    ["favicon.png", { size: 64, extent: 54, background: "#FBF8F7" }],
  ]) {
    const pipeline = sharp(svg(options));
    if (options.background) pipeline.removeAlpha();
    await pipeline.png().toFile(path.join(assets, name));
  }
  await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: "#FFFFFF" },
  })
    .png()
    .toFile(path.join(assets, "android-icon-background.png"));
  console.log(
    "Generated Amredi launcher, adaptive, monochrome, splash and favicon assets.",
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
