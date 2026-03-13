import type { User } from "./storage";

export function routeForUser(user: User) {
  if (user.role === "pending") return "/auth/onboarding";
  if (user.role === "builder") return "/builder/home";
  if (user.role === "owner") return "/owner/home";
  return "/labourer/home";
}
