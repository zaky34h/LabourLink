import { useEffect, useState } from "react";
import { getSessionEmail, getUserByEmail, type User } from "./storage";

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const email = await getSessionEmail();
    if (!email) {
      setUser(null);
      setLoading(false);
      return;
    }
    const u = await getUserByEmail(email);
    setUser(u);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return { user, loading, reload: load };
}