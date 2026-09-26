import { useEffect, useState } from "react";
import { crmSupabase } from "./supabase";

export default function CRM() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkAccess(currentSession) {
      if (!active) return;

      setLoading(true);
      setAuthorized(false);
      setSession(currentSession);

      if (!currentSession) {
        setLoading(false);
        return;
      }

      const { data, error } = await crmSupabase
        .from("crm_admins")
        .select("user_id")
        .eq("user_id", currentSession.user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setError("Impossibile verificare le autorizzazioni.");
      } else {
        setError("");
        setAuthorized(!!data);
      }

      setLoading(false);
    }

    crmSupabase.auth.getSession().then(({ data }) => {
      checkAccess(data.session);
    });

    const { data: listener } =
      crmSupabase.auth.onAuthStateChange(
        (event, newSession) => {
          if (event === "SIGNED_IN" ||
              event === "SIGNED_OUT") {
            checkAccess(newSession);
          }
        }
      );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function login(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const { error } =
        await crmSupabase.auth.signInWithPassword({
          email,
          password
        });

      if (error) setError(error.message);
    } catch {
      setError("Errore di connessione.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    const { error } = await crmSupabase.auth.signOut();

    if (error) {
      setError(error.message);
    } else {
      setSession(null);
      setAuthorized(false);
      setPassword("");
    }

    setBusy(false);
  }

  const style = {
    maxWidth: 420,
    margin: "70px auto",
    padding: 25,
    fontFamily: "Arial",
    border: "1px solid #ddd",
    borderRadius: 12
  };

  if (loading) {
    return <div style={style}>Verifica accesso...</div>;
  }

  if (session && !authorized) {
    return (
      <div style={style}>
        <h2>Storeitaly CRM</h2>
        <p>Accesso non autorizzato.</p>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button onClick={logout} disabled={busy}>
          ESCI
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={style}>
        <h2>Storeitaly CRM</h2>
        <p>Accesso riservato</p>

        <form onSubmit={login}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button disabled={busy}>
            {busy ? "Accesso..." : "ACCEDI"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={style}>
      <h2>Storeitaly CRM</h2>
      <p>Accesso autorizzato.</p>
      <button onClick={logout} disabled={busy}>
        ESCI
      </button>
    </div>
  );
}