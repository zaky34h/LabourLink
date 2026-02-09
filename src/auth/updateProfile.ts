import { getUsers, saveUsers, type BuilderUser } from "./storage";

export async function updateBuilderProfile(
  email: string,
  patch: Partial<Pick<BuilderUser, "firstName" | "lastName" | "companyName" | "about" | "address">>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const users = await getUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());

  if (idx === -1) return { ok: false, error: "User not found" };
  const u = users[idx];

  if (u.role !== "builder") return { ok: false, error: "Not a builder account" };

  users[idx] = { ...u, ...patch };
  await saveUsers(users);
  return { ok: true };
}