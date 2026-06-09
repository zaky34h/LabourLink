/**
 * Single source of truth for how user ROLES are DISPLAYED to users.
 *
 * IMPORTANT: the "builder" role is shown in the UI as "Company". This is a
 * label-only mapping — the internal role string stays "builder" everywhere
 * (role checks, the /builder routes, backend endpoints, and TypeScript types).
 * Translate a raw role into user-facing copy through this map; never print the
 * raw role value to the user.
 */
export const ROLE_LABELS: Record<string, string> = {
  builder: "Company",
  labourer: "Labourer",
  agency: "Agency",
  owner: "Owner",
  pending: "Pending",
};

/** Returns the user-facing label for a role, falling back to the raw value. */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return "";
  return ROLE_LABELS[role] ?? role;
}
