
import { useEffect, useState } from "react";
import { crmSupabase } from "./supabase";
import NuovaCantina from "./NuovaCantina";
import SchedaCantina from "./SchedaCantina";

const RIGHE_PER_PAGINA = 20;

const STATI = [
  "ATTIVO",
  "NUOVO",
  "IN TRATTATIVA",
  "NON INTERESSATO",
  "CESSATO"
];

export default function Cantine() {
  const [cantine, setCantine] = useState([]);
  const [totale, setTotale] = useState(0);

  const [ricerca, setRicerca] = useState("");
  const [ricercaApplicata, setRicercaApplicata] = useState("");
  const [stato, setStato] = useState("ATTIVO");
  const [pagina, setPagina] = useState(1);

  const [mostraModulo, setMostraModulo] = useState(false);
  const [cantinaSchedaId, setCantinaSchedaId] =
    useState(null);

  const [aggiornamento, setAggiornamento] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState("");

  const pagineTotali = Math.max(
    1,
    Math.ceil(totale / RIGHE_PER_PAGINA)
  );

  useEffect(() => {
    let active = true;

    async function caricaCantine() {
      setLoading(true);
      setErrore("");

      let query = crmSupabase
        .from("crm_cantine")
        .select(
          "id, id_portale, nome_portale, ragione_sociale, stato, citta, provincia, regione",
          { count: "exact" }
        );

      if (stato !== "TUTTI") {
        query = query.eq("stato", stato);
      }

      if (ricercaApplicata) {
        // Ricerca esclusivamente nel nome del portale.
        // I caratteri speciali della ricerca vengono
        // trattati come testo normale.
        const testo = ricercaApplicata
          .replace(/\\/g, "\\\\")
          .replace(/%/g, "\\%")
          .replace(/_/g, "\\_");

        query = query.ilike(
          "nome_portale",
          `%${testo}%`
        );
      }

      const inizio =
        (pagina - 1) * RIGHE_PER_PAGINA;

      const fine =
        inizio + RIGHE_PER_PAGINA - 1;

      const { data, error, count } = await query
        .order("nome_portale", {
          ascending: true,
          nullsFirst: false
        })
        .order("id", { ascending: true })
        .range(inizio, fine);

      if (!active) return;

      if (error) {
        console.error(error);
        setErrore(
          "Impossibile caricare le cantine."
        );
        setCantine([]);
        setTotale(0);
      } else {
        const numero = count ?? 0;

        // Se il numero di risultati diminuisce
        // e la pagina corrente non esiste più,
        // torniamo alla prima pagina.
        if (
          numero > 0 &&
          inizio >= numero &&
          pagina > 1
        ) {
          setPagina(1);
          return;
        }

        setCantine(data ?? []);
        setTotale(numero);
      }

      setLoading(false);
    }

    if (cantinaSchedaId === null) {
      caricaCantine();
    }

    return () => {
      active = false;
    };
  }, [
    stato,
    ricercaApplicata,
    pagina,
    aggiornamento,
    cantinaSchedaId
  ]);

  function cambiaStato(valore) {
    setStato(valore);
    setPagina(1);
  }

  function cerca(evento) {
    evento.preventDefault();
    setPagina(1);
    setRicercaApplicata(ricerca.trim());
  }

  function pulisciRicerca() {
    setRicerca("");
    setRicercaApplicata("");
    setPagina(1);
  }

  function salvata() {
    setMostraModulo(false);
    setPagina(1);
    setAggiornamento((n) => n + 1);
  }

  const stileCella = {
    padding: "7px 9px",
    fontSize: 12,
    textAlign: "left",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap"
  };

  const stilePulsante = {
    padding: "5px 10px",
    fontSize: 12,
    whiteSpace: "nowrap",
    cursor: "pointer"
  };

  if (cantinaSchedaId !== null) {
    return (
      <SchedaCantina
        cantinaId={cantinaSchedaId}
        onChiudi={() => {
          setCantinaSchedaId(null);
          setAggiornamento((n) => n + 1);
        }}
      />
    );
  }

  return (
    <section style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 12
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12
          }}
        >
          <h2 style={{ margin: 0 }}>Cantine</h2>

          {!loading && !errore && (
            <span
              style={{
                fontSize: 12,
                color: "#64748b"
              }}
            >
              {totale} risultati
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setMostraModulo((precedente) => !precedente)
          }
          style={stilePulsante}
        >
          + NUOVA CANTINA
        </button>
      </div>

      {mostraModulo && (
        <div
          style={{
            padding: 12,
            marginBottom: 14,
            border: "1px solid #ddd",
            borderRadius: 6,
            background: "#f8fafc"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12
            }}
          >
            <h3 style={{ margin: 0 }}>
              Nuova cantina
            </h3>

            <button
              type="button"
              onClick={() => setMostraModulo(false)}
              style={stilePulsante}
            >
              ANNULLA
            </button>
          </div>

          <NuovaCantina
            onSalvata={salvata}
          />
        </div>
      )}

      <form
        onSubmit={cerca}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "end",
          gap: 10,
          marginBottom: 12
        }}
      >
        <label style={{ fontSize: 12 }}>
          <div style={{ marginBottom: 4 }}>
            Stato
          </div>

          <select
            value={stato}
            onChange={(e) =>
              cambiaStato(e.target.value)
            }
            style={{
              minWidth: 170,
              height: 34,
              padding: "4px 8px"
            }}
          >
            <option value="TUTTI">
              TUTTI
            </option>

            {STATI.map((voce) => (
              <option
                key={voce}
                value={voce}
              >
                {voce}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            fontSize: 12,
            flex: "1 1 250px"
          }}
        >
          <div style={{ marginBottom: 4 }}>
            Cerca nome cantina
          </div>

          <input
            type="search"
            value={ricerca}
            onChange={(e) =>
              setRicerca(e.target.value)
            }
            placeholder="Nome sul portale..."
            style={{
              width: "100%",
              height: 34,
              padding: "4px 9px",
              boxSizing: "border-box"
            }}
          />
        </label>

        <button
          type="submit"
          style={{
            ...stilePulsante,
            height: 34
          }}
        >
          CERCA
        </button>

        <button
          type="button"
          onClick={pulisciRicerca}
          style={{
            ...stilePulsante,
            height: 34
          }}
        >
          AZZERA
        </button>
      </form>

      {errore && (
        <p style={{ color: "red" }}>
          {errore}
        </p>
      )}

      {loading && (
        <p style={{ fontSize: 12 }}>
          Caricamento cantine...
        </p>
      )}

      {!loading && !errore && (
        <>
          <div
            style={{
              overflowX: "auto",
              border: "1px solid #e2e8f0",
              borderRadius: 6
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse"
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f1f5f9"
                  }}
                >
                  <th style={stileCella}>Scheda</th>
                  {[
                    "ID Portale",
                    "Nome cantina",
                    "Stato",
                    "Città",
                    "Provincia",
                    "Regione"
                  ].map((titolo) => (
                    <th
                      key={titolo}
                      style={stileCella}
                    >
                      {titolo}
                    </th>
                  ))}

                  <th
                    style={{
                      ...stileCella,
                      textAlign: "right"
                    }}
                  >
                    Scheda
                  </th>
                </tr>
              </thead>

              <tbody>
                {cantine.map((cantina) => (
                  <tr key={cantina.id}>
                    <td style={stileCella}>
  <button
    type="button"
    onClick={() => setCantinaSchedaId(cantina.id)}
    style={stilePulsante}
  >
    SCHEDA →
  </button>
</td>
                    <td style={stileCella}>
                      {cantina.id_portale || "—"}
                    </td>

                    <td
                      style={{
                        ...stileCella,
                        whiteSpace: "normal",
                        minWidth: 170,
                        fontWeight: 600
                      }}
                    >
                      {cantina.nome_portale ||
                        cantina.ragione_sociale}
                    </td>

                    <td style={stileCella}>
                      {cantina.stato}
                    </td>

                    <td style={stileCella}>
                      {cantina.citta || "—"}
                    </td>

                    <td style={stileCella}>
                      {cantina.provincia || "—"}
                    </td>

                    <td style={stileCella}>
                      {cantina.regione || "—"}
                    </td>

                    <td
                      style={{
                        ...stileCella,
                        textAlign: "right"
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setCantinaSchedaId(
                            cantina.id
                          )
                        }
                        style={stilePulsante}
                      >
                        SCHEDA →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {cantine.length === 0 && (
              <p
                style={{
                  padding: 15,
                  textAlign: "center",
                  fontSize: 12
                }}
              >
                Nessuna cantina trovata.
              </p>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 12,
              fontSize: 12
            }}
          >
            <span>
              {totale === 0
                ? "0 risultati"
                : `${(pagina - 1) *
                    RIGHE_PER_PAGINA + 1}–${Math.min(
                    pagina * RIGHE_PER_PAGINA,
                    totale
                  )} di ${totale}`}
            </span>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10
              }}
            >
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() =>
                  setPagina((p) => p - 1)
                }
                style={stilePulsante}
              >
                ← PRECEDENTE
              </button>

              <span>
                Pagina {pagina} di {pagineTotali}
              </span>

              <button
                type="button"
                disabled={pagina >= pagineTotali}
                onClick={() =>
                  setPagina((p) => p + 1)
                }
                style={stilePulsante}
              >
                SUCCESSIVA →
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
