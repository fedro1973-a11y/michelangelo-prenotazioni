
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

const CLASSI_STATO = {
  ATTIVO: "active",
  NUOVO: "new",
  "IN TRATTATIVA": "progress",
  "NON INTERESSATO": "not-interested",
  CESSATO: "closed"
};

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
    <section className="crm-cantine">
      <div className="crm-cantine__header">
        <div className="crm-cantine__heading">
          <h2>Cantine</h2>

          {!loading && !errore && (
            <span className="crm-cantine__count">
              {totale} risultati
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setMostraModulo((precedente) => !precedente)
          }
          className="crm-button--primary"
        >
          + NUOVA CANTINA
        </button>
      </div>

      {mostraModulo && (
        <div className="crm-cantine__new-form">
          <div className="crm-cantine__new-form-header">
            <h3>Nuova cantina</h3>

            <button
              type="button"
              onClick={() => setMostraModulo(false)}
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
        className="crm-cantine__filters"
      >
        <label className="crm-cantine__field crm-cantine__field--status">
          Stato
          <select
            value={stato}
            onChange={(e) =>
              cambiaStato(e.target.value)
            }
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

        <label className="crm-cantine__field crm-cantine__field--search">
          Cerca nome cantina
          <input
            type="search"
            value={ricerca}
            onChange={(e) =>
              setRicerca(e.target.value)
            }
            placeholder="Nome sul portale..."
          />
        </label>

        <button type="submit">
          CERCA
        </button>

        <button
          type="button"
          onClick={pulisciRicerca}
        >
          AZZERA
        </button>
      </form>

      {errore && (
        <p className="crm-cantine__error" role="alert">
          {errore}
        </p>
      )}

      {loading && (
        <p className="crm-cantine__loading" role="status">
          Caricamento cantine...
        </p>
      )}

      {!loading && !errore && (
        <>
          <div className="crm-cantine__table-wrap">
            <table className="crm-cantine__table">
              <thead>
                <tr>
                  {[
                    "ID Portale",
                    "Nome cantina",
                    "Stato",
                    "Città",
                    "Provincia",
                    "Regione"
                  ].map((titolo) => (
                    <th key={titolo} scope="col">
                      {titolo}
                    </th>
                  ))}

                  <th scope="col">Azioni</th>
                </tr>
              </thead>

              <tbody>
                {cantine.map((cantina) => (
                  <tr key={cantina.id}>
                    <td>
                      {cantina.id_portale || "—"}
                    </td>

                    <td className="crm-cantine__name">
                      {cantina.nome_portale ||
                        cantina.ragione_sociale}
                    </td>

                    <td>
                      <span className={`crm-status crm-status--${CLASSI_STATO[cantina.stato] || "closed"}`}>
                        {cantina.stato}
                      </span>
                    </td>

                    <td>
                      {cantina.citta || "—"}
                    </td>

                    <td>
                      {cantina.provincia || "—"}
                    </td>

                    <td>
                      {cantina.regione || "—"}
                    </td>

                    <td className="crm-cantine__action">
                      <button
                        type="button"
                        onClick={() => setCantinaSchedaId(cantina.id)}
                      >
                        Apri
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {cantine.length === 0 && (
              <p className="crm-cantine__empty">
                Nessuna cantina trovata.
              </p>
            )}
          </div>

          <div className="crm-cantine__pagination">
            <span>
              {totale === 0
                ? "0 risultati"
                : `${(pagina - 1) *
                    RIGHE_PER_PAGINA + 1}–${Math.min(
                    pagina * RIGHE_PER_PAGINA,
                    totale
                  )} di ${totale}`}
            </span>

            <div className="crm-cantine__pagination-controls">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() =>
                  setPagina((p) => p - 1)
                }
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
