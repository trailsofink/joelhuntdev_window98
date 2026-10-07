// Turns the private screenshots in assets-raw/ into publishable WebP files in
// src/assets/screens/. Astro then makes AVIF/WebP sizes from these at build.
//
//   node scripts/optimize-screens.mjs [path/to/assets-raw]
//
// assets-raw/ is gitignored, so the published WebP files are committed and
// this script only needs to run when a screenshot changes.
//
// PRIVACY: Bulqit's seed data uses a real street address and its street-view
// house photo. Every rectangle in `blur` is in the source image's own pixels
// (before crop and resize) and is pixelated, then blurred, so neither the
// address text nor the house can be recovered. Check each output by eye after
// changing anything here.
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const raw = resolve(process.argv[2] ?? join(root, 'assets-raw'));
const outDir = join(root, 'src/assets/screens');

const DESKTOP = 1600;
const MOBILE = 780;

/** @typedef {{ left: number, top: number, width: number, height: number }} Rect */
/** @type {{ src: string, out: string, width: number, crop?: Rect, blur?: Rect[] }[]} */
const manifest = [
  // Bulqit marketing and app screens (2x DPR captures of the local app)
  { src: 'screens/marketing/vendors-desktop.png', out: 'bulqit-vendors-landing.webp', width: DESKTOP },
  { src: 'screens/marketing/home-desktop.png', out: 'bulqit-home.webp', width: DESKTOP },
  { src: 'screens/member/services-desktop.png', out: 'bulqit-member-services.webp', width: DESKTOP },
  {
    src: 'screens/member/jobs-desktop.png', out: 'bulqit-member-history.webp', width: DESKTOP,
    crop: { left: 0, top: 0, width: 2880, height: 1110 },
  },
  { src: 'screens/vendor/dashboard-desktop.png', out: 'bulqit-vendor-dashboard.webp', width: DESKTOP },
  { src: 'screens/onboarding/vendor-1-intro-desktop.png', out: 'bulqit-vendor-onboarding.webp', width: DESKTOP },
  {
    src: 'screens/vendor/calendar-desktop.png', out: 'bulqit-vendor-calendar.webp', width: DESKTOP,
    blur: [
      { left: 540, top: 490, width: 366, height: 1310 }, // street-view photos, every card
      { left: 930, top: 630, width: 290, height: 58 }, // address, card 1
      { left: 930, top: 1048, width: 290, height: 58 }, // address, card 2
      { left: 930, top: 1465, width: 290, height: 58 }, // address, card 3
    ],
  },
  {
    src: 'screens/field-worker/my-jobs-mobile.png', out: 'bulqit-field-jobs-mobile.webp', width: MOBILE,
    blur: [
      { left: 62, top: 480, width: 656, height: 424 }, // street-view photo
      { left: 60, top: 1106, width: 300, height: 58 }, // address
    ],
  },
  {
    src: 'screens/member/dashboard-mobile.png', out: 'bulqit-member-dashboard-mobile.webp', width: MOBILE,
    blur: [{ left: 58, top: 332, width: 284, height: 56 }], // address under "Welcome, Mia"
  },
  {
    src: 'figma/vendors/cycle-4/D - Bidding - Enter Your Bid (Cost Per Unit).png', out: 'bulqit-bidding-figma.webp', width: 1440,
    blur: [{ left: 22, top: 860, width: 200, height: 34 }], // placeholder user name in the sidebar
  },

  // Bulqit Figma frames (1x exports). The design files reuse the seed house
  // photo and address, a real person's name as the signed-in user, and a
  // vendor's logo, so all of those are obscured.
  {
    src: 'figma/vendors/inbox/D - Inbox - Chat - Proposal (Recurring).png', out: 'bulqit-inbox-proposal-figma.webp', width: 1440,
    blur: [
      { left: 282, top: 192, width: 52, height: 404 }, // house-photo avatars, every conversation
      { left: 970, top: 12, width: 60, height: 60 }, // house-photo avatar, panel header
      { left: 1036, top: 44, width: 246, height: 22 }, // street address, panel header
      { left: 44, top: 852, width: 124, height: 28 }, // user name in the sidebar
    ],
  },
  {
    src: 'figma/vendors/homes/D - Homes Overview.png', out: 'bulqit-homes-figma.webp', width: 1440,
    blur: [
      { left: 272, top: 167, width: 170, height: 730 }, // street-view photos, every card
      { left: 952, top: 0, width: 488, height: 182 }, // street-view photo, detail panel
      { left: 1086, top: 158, width: 222, height: 36 }, // street address, detail panel
      { left: 44, top: 852, width: 124, height: 28 }, // user name in the sidebar
    ],
  },
  {
    src: 'figma/design-system/color/Brand Palette.png', out: 'bulqit-figma-color-tokens.webp', width: DESKTOP,
    crop: { left: 0, top: 0, width: 1440, height: 1140 }, // Primary through Information scales
  },
  {
    src: 'figma/design-system/typography/Type Semantics.png', out: 'bulqit-figma-text-styles.webp', width: DESKTOP,
    crop: { left: 120, top: 160, width: 3160, height: 1200 }, // desktop display and heading styles
  },
  {
    src: 'figma/design-system/example-layouts/D - Calendar Flow - Upcoming.png', out: 'bulqit-figma-example-layout.webp', width: 1440,
    blur: [
      { left: 180, top: 20, width: 40, height: 40 }, // vendor's logo
      { left: 44, top: 762, width: 124, height: 28 }, // user name in the sidebar
      { left: 1026, top: 438, width: 376, height: 74 }, // staff names in the Share popover
      { left: 940, top: 345, width: 68, height: 345 }, // street-view photos, left of the popover
      { left: 940, top: 690, width: 96, height: 268 }, // street-view photos, below the popover
      { left: 1052, top: 712, width: 170, height: 30 }, // street address, card 4
      { left: 1052, top: 815, width: 170, height: 30 }, // street address, card 5
      { left: 1052, top: 918, width: 170, height: 30 }, // street address, card 6
    ],
  },

  // FiveQ client sites
  { src: 'screens/fiveq/wiersbe-search-desktop.png', out: 'fiveq-wiersbe-search.webp', width: DESKTOP },
  { src: 'screens/fiveq/hutchcraft-search-desktop.png', out: 'fiveq-hutchcraft-search.webp', width: DESKTOP },
  { src: 'screens/fiveq/humanitas-search-desktop.png', out: 'fiveq-humanitas-search.webp', width: DESKTOP },
  { src: 'screens/fiveq/humanitas-map-mobile.png', out: 'fiveq-humanitas-map-mobile.webp', width: MOBILE },
  { src: 'screens/fiveq/lcr-liveplayer-desktop.png', out: 'fiveq-lcr-liveplayer.webp', width: DESKTOP },
  { src: 'screens/fiveq/lcr-schedule-desktop.png', out: 'fiveq-lcr-schedule.webp', width: DESKTOP },
  { src: 'screens/fiveq/hutchcraft-player-mobile.png', out: 'fiveq-hutchcraft-player-mobile.webp', width: MOBILE },
];

/** Pixelate then blur one region so the original detail is gone, not just soft. */
async function obscure(input, rect) {
  const tile = await sharp(input)
    .extract(rect)
    .resize(Math.max(1, Math.round(rect.width / 24)), Math.max(1, Math.round(rect.height / 24)), { fit: 'fill' })
    .resize(rect.width, rect.height, { fit: 'fill', kernel: 'nearest' })
    .blur(Math.max(6, Math.min(rect.width, rect.height) / 6))
    .png()
    .toBuffer();
  return { input: tile, left: rect.left, top: rect.top };
}

await mkdir(outDir, { recursive: true });

for (const item of manifest) {
  const src = join(raw, item.src);
  let buf = await sharp(src).png().toBuffer();
  if (item.blur?.length) {
    const layers = await Promise.all(item.blur.map((r) => obscure(buf, r)));
    buf = await sharp(buf).composite(layers).png().toBuffer();
  }
  let img = sharp(buf);
  if (item.crop) img = img.extract(item.crop);
  const out = join(outDir, item.out);
  const info = await img
    .resize({ width: item.width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(out);
  console.log(`${item.out}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
}
