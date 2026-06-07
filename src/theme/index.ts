import { Platform, TextStyle } from "react-native";

/**
 * Labourlink theme — Twoflo visual system.
 * Single source of truth. Re-skinning the whole app = editing this file.
 * Seeded to preserve flat, border-driven layout (no shadows), light-mode only.
 */

export const colors = {
  // Surfaces
  background: "#F2EDE3", // page background everywhere (cream)
  surface: "#ECE5D4", // cards, callout panels (darker cream)
  field: "#FAF6EC", // input fills (extension: near-white warm, reads on either cream)
  border: "#D0C8B6", // 1px rules / dividers / input borders
  borderStrong: "#1F1F1F", // outlined-button + emphasis borders

  // Text
  text: "#1F1F1F", // headings + body
  textSecondary: "#6B6B6B", // labels, eyebrows, captions
  onDark: "#F2EDE3", // cream text sitting on a black surface

  // Primary action
  primary: "#1F1F1F", // primary button bg (black)
  onPrimary: "#F2EDE3", // primary button label (cream)

  // Status — mapped from the Twoflo badge palette onto Labourlink job/app states
  successBg: "#C8D6BD",
  successText: "#2D4A1F", // sage   — Open / Approved / Confirmed
  pendingBg: "#E8C8A0",
  pendingText: "#6A4310", // amber  — Applied / In progress
  neutralBg: "#DDD5C2",
  neutralText: "#5A4A30", // beige  — Draft / Pending
  gatedBg: "#D4C8A8",
  gatedText: "#5A4520", // deeper — Verify / Gated

  // Danger — EXTENSION. Twoflo has no error colour; tuned to sit on cream.
  dangerBg: "#EAD7CF",
  dangerText: "#8A2D1F",

  /**
   * OPTIONAL legacy brand accent.
   * Default = on-palette muted grey for the wordmark "." / accent.
   * Set to "#FDE047" to keep Labourlink's original yellow as the single
   * signature colour (recommended if the app already has recognition).
   */
  wordmarkAccent: "#6B6B6B",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radii = { sm: 8, md: 10, lg: 12, xl: 16, pill: 999 } as const;

// Helvetica Neue on iOS (ships with the OS); graceful fallbacks elsewhere.
export const fontFamily =
  Platform.select({ ios: "Helvetica Neue", android: "sans-serif", default: "System" }) ?? "System";

export const fontSize = {
  display: 30,
  h1: 26,
  h2: 22,
  h3: 18,
  body: 15,
  label: 13,
  caption: 11,
  eyebrow: 10,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  bold: "700",
  heavy: "800",
} as const satisfies Record<string, TextStyle["fontWeight"]>;

// Ready-made text styles for common roles.
export const type = {
  display: {
    fontFamily,
    fontSize: fontSize.display,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    letterSpacing: -0.5,
  },
  h1: { fontFamily, fontSize: fontSize.h1, fontWeight: fontWeight.heavy, color: colors.text },
  h2: { fontFamily, fontSize: fontSize.h2, fontWeight: fontWeight.bold, color: colors.text },
  h3: { fontFamily, fontSize: fontSize.h3, fontWeight: fontWeight.bold, color: colors.text },
  body: { fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.regular, color: colors.text },
  secondary: {
    fontFamily,
    fontSize: fontSize.label,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
  },
  eyebrow: {
    fontFamily,
    fontSize: fontSize.eyebrow,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
} satisfies Record<string, TextStyle>;

const theme = { colors, spacing, radii, fontFamily, fontSize, fontWeight, type };
export default theme;
