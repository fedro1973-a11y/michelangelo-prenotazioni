
import { useEffect, useState } from "react";
import { crmSupabase } from "./supabase";
import NuovaCantina from "./NuovaCantina";

export default function Cantine() {
  const [cantine, setCantine] = useState([]);
  const [mostraModulo, setMostraModulo] = useState(false);
  const [cantinaInModifica, setCantinaInModifica] = useState(null);
  const [aggiornamento, setAggiornamento] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function caricaCantine() {
      setLoading(true);
      setError("");

      const { data, error } = await crmSupabase
        .from("crm_cantine")
        .select(
          "id, ragione_sociale, partita_iva, indirizzo, referente, cellulare, telefono, email, stato, id_portale, segnalatore_id"
        )
        .order("ragione_sociale");

      if (!active) return;

      if (error) {
        setError("Errore durante il caricamento delle cantine.");
      } else {
        setCantine(data ?? []);
      }

      setLoading(false);
    }

    caricaCantine();

    return () => {
      active = false;
    };
  }, [aggiornamento]);

  function nuovaCantina() {
    if (mostraModulo && !cantinaInModifica) {
      setMostraModulo(false);
    } else {
      setCantinaInModifica(null);
      setMostraModulo(true);
    }
  }

  function modificaCantina(cantina) {
    setCantinaInModifica(cantina);
    setMostraModulo(true);
  }

  function annulla() {
    setMostraModulo(false);
    setCantinaInModifica(null);
  }

  function salvata() {
    annulla();
    setAggiornamento((precedente) => precedente + 1);
  }

  return (
    <section style={{ marginTop: 25 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <h2>Cantine</h2>

        <button onClick={nuovaCantina}>
          + NUOVA CANTINA
        </button>
      </div>

      {mostraModulo && (
        <div
          style={{
            padding: 20,
            marginBottom: 20,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 8
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12
            }}
          >
            <h3>
              {cantinaInModifica
                ? `Modifica: ${cantinaInModifica.ragione_sociale}`
                : "Nuova cantina"}
            </h3>

            <button type="button" onClick={annulla}>
              ANNULLA
            </button>
          </div>

          <NuovaCantina
            key={cantinaInModifica?.id ?? "nuova"}
            cantina={cantinaInModifica}
            onSalvata={salvata}
          />
        </div>
      )}

      {loading && <p>Caricamento...</p>}

      {error && (
        <p style={{ color: "red" }}>{error}</p>
      )}

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
              <th>Azioni</th>
            </tr>
          </thead>

          <tbody>
            {cantine.map((cantina) => (
              <tr key={cantina.id}>
                <td>{cantina.ragione_sociale}</td>
                <td>{cantina.stato}</td>
                <td>{cantina.referente}</td>
                <td>{cantina.email}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => modificaCantina(cantina)}
                  >
                    MODIFICA
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
