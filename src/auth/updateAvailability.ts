import { getUsers, saveUsers, type LabourerUser } from "./storage";

export async function updateLabourerAvailability(
  email: string,
  availableDates: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const users = await getUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) return { ok: false, error: "User not found" };

  const user = users[idx];
  if (user.role !== "labourer") return { ok: false, error: "Not a labourer account" };

  const updated: LabourerUser = { ...user, availableDates };
  users[idx] = updated;

  await saveUsers(users);
  return { ok: true };
}