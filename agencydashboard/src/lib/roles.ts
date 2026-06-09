/**
 * Single source of truth for how user ROLES are DISPLAYED in the dashboard UI.
 *
 * IMPORTANT: the "builder" role is shown to users as "Company". This is a
 * label-only mapping — internal identifiers (the role string "builder", the
 * `builderName` / `builderCompany` fields, backend endpoints, and types) stay
 * unchanged. Translate a raw role into copy through this map.
 */
export const ROLE_LABELS: Record<string, string> = {
  builder: "Company",
  labourer: "Labourer",
  agency: "Agency",
};

/** Returns the user-facing label for a role, falling back to the raw value. */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
