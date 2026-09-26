import { useEffect, useState } from "react";
import { crmSupabase } from "./supabase";

export default function Cantine() {
  const [cantine, setCantine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function caricaCantine() {
      const { data, error } = await crmSupabase
        .from("crm_cantine")
        .select("id, ragione_sociale, stato, referente, email")
        .order("ragione_sociale");

      if (!active) return;

      if (error) {
        setError("Errore durante il caricamento delle cantine.");
      } else {
        setCantine(data);
      }

      setLoading(false);
    }

    caricaCantine();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section style={{ marginTop: 25 }}>
      <h2>Cantine</h2>

      {loading && <p>Caricamento...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && cantine.length === 0 && (
        <p>Nessuna cantina presente.</p>
      )}

      {!loading && !error && cantine.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Cantina</th>
              <th>Stato</th>
              <th>Referente</th>
              <th>Email</th>
            </tr>
          </thead>

          <tbody>
            {cantine.map((cantina) => (
              <tr key={cantina.id}>
                <td>{cantina.ragione_sociale}</td>
                <td>{cantina.stato}</td>
                <td>{cantina.referente}</td>
                <td>{cantina.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}