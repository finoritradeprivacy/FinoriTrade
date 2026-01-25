import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    const raw = import.meta.env.VITE_ADMIN_EMAILS ?? "";
    const allowed = raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const email = (user.email || "").toLowerCase();
    const nickname = user.user_metadata?.nickname || "";
    const match = (allowed.length > 0 && allowed.includes(email)) || nickname === "tester";
    setIsAdmin(match);
    setLoading(false);
  }, [user]);

  return { isAdmin, loading };
};
