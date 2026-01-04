import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        // 🔐 LOGIN
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setMessage("✅ Přihlášení úspěšné");
      } else {
        // 🆕 SIGNUP
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nickname,
            },
          },
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setMessage(
            "📧 Registrační email odeslán. Potvrď email a pak se přihlas."
          );
        } else {
          setMessage("✅ Registrace úspěšná, jsi přihlášen");
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", color: "white" }}>
      <h2>{isLogin ? "Přihlášení" : "Registrace"}</h2>

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <input
            type="text"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            style={{ width: "100%", marginBottom: 10 }}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", marginBottom: 10 }}
        />

        <input
          type="password"
          placeholder="Heslo"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", marginBottom: 10 }}
        />

        <button type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading
            ? "Počkej..."
            : isLogin
            ? "Přihlásit se"
            : "Registrovat se"}
        </button>
      </form>

      <p style={{ marginTop: 20 }}>
        {isLogin ? "Nemáš účet?" : "Už máš účet?"}{" "}
        <button
          onClick={() => setIsLogin(!isLogin)}
          style={{ color: "#a855f7", background: "none", border: "none" }}
        >
          {isLogin ? "Zaregistrovat se" : "Přihlásit se"}
        </button>
      </p>

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  );
}
