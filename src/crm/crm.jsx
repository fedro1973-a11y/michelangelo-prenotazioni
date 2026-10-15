import { useEffect, useRef, useState } from "react";
import { crmSupabase } from "./supabase";
import Cantine from "./Cantine";
import Segnalatori from "./Segnalatori";
import Dashboard from "./Dashboard";
import Progetti from "./Progetti";
import "./crm.css";

export default function CRM() {
  const [session, setSession] = useState(null);
  const [pagina, setPagina] = useState("dashboard");
  const [dashboardKey, setDashboardKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const accessRequestId = useRef(0);
  const authEventRevision = useRef(0);
  const verifiedAccess = useRef({ userId: null, authorized: false });
  const pendingAccessCheck = useRef(null);

  useEffect(() => {
    let active = true;

    async function checkAccess(currentSession) {
      if (!active) return;

      const userId = currentSession?.user?.id ?? null;

      if (!userId) {
        accessRequestId.current += 1;
        pendingAccessCheck.current = null;
        verifiedAccess.current = { userId: null, authorized: false };
        setSession(null);
        setAuthorized(false);
        setLoading(false);
        setError("");
        return;
      }

      if (
        verifiedAccess.current.userId === userId &&
        verifiedAccess.current.authorized
      ) {
        return;
      }

      if (pendingAccessCheck.current?.userId === userId) return;

      const requestId = ++accessRequestId.current;
      pendingAccessCheck.current = { userId, requestId };
      setLoading(true);
      setAuthorized(false);
      setSession(currentSession);

      try {
        const { data, error: accessError } = await crmSupabase
          .from("crm_admins")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!active || requestId !== accessRequestId.current) return;

        if (accessError) {
          console.error(accessError);
          setError("Impossibile verificare le autorizzazioni.");
          verifiedAccess.current = { userId, authorized: false };
        } else {
          setError("");
          const isAuthorized = !!data;
          setAuthorized(isAuthorized);
          verifiedAccess.current = { userId, authorized: isAuthorized };
        }
      } catch (accessError) {
        if (!active || requestId !== accessRequestId.current) return;

        console.error(accessError);
        setError("Impossibile verificare le autorizzazioni.");
        verifiedAccess.current = { userId, authorized: false };
      } finally {
        if (active && requestId === accessRequestId.current) {
          pendingAccessCheck.current = null;
          setLoading(false);
        }
      }
    }

    const initialAuthEventRevision = authEventRevision.current;
    crmSupabase.auth.getSession().then(({ data }) => {
      if (
        active &&
        authEventRevision.current === initialAuthEventRevision
      ) {
        checkAccess(data.session);
      }
    });

    const { data: listener } =
      crmSupabase.auth.onAuthStateChange(
        (event, newSession) => {
          if (event === "SIGNED_IN") {
            authEventRevision.current += 1;
            checkAccess(newSession);
          } else if (event === "SIGNED_OUT") {
            authEventRevision.current += 1;
            checkAccess(null);
          }
        }
      );

    return () => {
      active = false;
      accessRequestId.current += 1;
      pendingAccessCheck.current = null;
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
  <div className={`crm-shell${pagina === "cantine" || pagina === "dashboard" || pagina === "progetti" ? " crm-shell--wide" : ""}`}>
    <header style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }}>
      <h2>Storeitaly CRM</h2>
      <button onClick={logout} disabled={busy}>
        ESCI
      </button>
    </header>

    <nav style={{
  display: "flex",
  gap: 8,
  marginBottom: 20
}}>

  <button
  onClick={() => {
  setPagina("dashboard");
  setDashboardKey((k) => k + 1);
}}

>
  DASHBOARD
</button>

  <button
    onClick={() => setPagina("cantine")}
    disabled={pagina === "cantine"}
  >
    CANTINE
  </button>

  <button
    onClick={() => setPagina("progetti")}
    disabled={pagina === "progetti"}
  >
    PROGETTI
  </button>

  <button
    onClick={() => setPagina("segnalatori")}
    disabled={pagina === "segnalatori"}
  >
    SEGNALATORI
  </button>
</nav>

{pagina === "dashboard" && <Dashboard key={dashboardKey} />}
{pagina === "cantine" && <Cantine />}
{pagina === "progetti" && <Progetti />}
{pagina === "segnalatori" && <Segnalatori />}
  </div>
);
}