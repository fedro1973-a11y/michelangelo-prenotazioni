import { useEffect, useState } from "react";
import { crmSupabase } from "./supabase";
import NuovaCantina from "./NuovaCantina";


export default function Cantine() {
  const [cantine, setCantine] = useState([]);
  const [mostraModulo, setMostraModulo] = useState(false);
  const [aggiornamento, setAggiornamento] = useState(0);
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
   }, [aggiornamento]);

  return (
    <section style={{ marginTop: 25 }}>
      <div style={{
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
}}>
  <h2>Cantine</h2>

  <button
    onClick={() => setMostraModulo(!mostraModulo)}
  >
    {mostraModulo ? "ANNULLA" : "+ NUOVA CANTINA"}
  </button>
</div>

{mostraModulo && (
  <div style={{
    padding: 20,
    marginBottom: 20,
    background: "white",
    border: "1px solid #ddd",
    borderRadius: 8
  }}>
    <h3>Nuova cantina</h3>
   <NuovaCantina
  onSalvata={() => {
    setMostraModulo(false);
    setAggiornamento((precedente) => precedente + 1);
  }}
/>
  </div>
)}

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