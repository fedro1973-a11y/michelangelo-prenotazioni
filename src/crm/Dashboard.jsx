import { useEffect, useState } from "react";
import { crmSupabase } from "./supabase";
import SchedaCantina from "./SchedaCantina";

export default function Dashboard() {
  const [attivita, setAttivita] = useState([]);
  const [cantineSilenti, setCantineSilenti] = useState([]);
  const [cantinaSilenteAperta, setCantinaSilenteAperta] = useState(null);
  const [attivitaAperta, setAttivitaAperta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState("");
  const [filtro, setFiltro] = useState("SCADUTE");

  useEffect(() => {
  caricaAttivita();
  caricaCantineSilenti();
}, []);

  async function caricaAttivita() {
    setLoading(true);
    setErrore("");

    const { data, error } = await crmSupabase
      .from("crm_attivita")
      .select(`
        id,
        cantina_id,
        descrizione,
        scadenza,
        completata,
        crm_cantine (
          nome_portale
        )
      `)
      .eq("completata", false)
      .order("scadenza", { ascending: true });

    if (error) {
      console.error(error);
      setErrore("Errore nel caricamento delle attività.");
      setAttivita([]);
    } else {
      setAttivita(data || []);
    }

    setLoading(false);
  }


async function caricaCantineSilenti() {
  try {
    const { data: cantine, error: erroreCantine } =
      await crmSupabase
        .from("crm_cantine")
        .select("id, nome_portale, stato")
        .in("stato", ["ATTIVO", "IN TRATTATIVA"]);

    if (erroreCantine) throw erroreCantine;

 const contatti = [];
const dimensionePagina = 500;
let inizio = 0;

while (true) {
  const { data, error } = await crmSupabase
    .from("crm_contatti")
    .select("cantina_id, data_contatto")
    .order("data_contatto", { ascending: false })
    .order("cantina_id", { ascending: true })
    .range(inizio, inizio + dimensionePagina - 1);

  if (error) throw error;

  contatti.push(...(data ?? []));

  if (!data || data.length < dimensionePagina) {
    break;
  }

  inizio += dimensionePagina;
}

    const ultimiContatti = new Map();

    for (const contatto of contatti ?? []) {
      if (!ultimiContatti.has(contatto.cantina_id)) {
        ultimiContatti.set(
          contatto.cantina_id,
          contatto.data_contatto
        );
      }
    }

    const soglia = new Date();
    soglia.setDate(soglia.getDate() - 90);

    const silenti = (cantine ?? [])
      .map((cantina) => ({
        ...cantina,
        ultimo_contatto:
          ultimiContatti.get(cantina.id) ?? null
      }))
      .filter(
        (cantina) =>
          !cantina.ultimo_contatto ||
          new Date(cantina.ultimo_contatto) < soglia
      )
      .sort((a, b) => {
        if (!a.ultimo_contatto) return -1;
        if (!b.ultimo_contatto) return 1;

        return (
          new Date(a.ultimo_contatto) -
          new Date(b.ultimo_contatto)
        );
      });

    setCantineSilenti(silenti);
  } catch (err) {
    console.error("Errore caricamento cantine silenti:", err);
    setErrore("Impossibile caricare le cantine silenti.");
  }
}

  function dataLocale(data) {
    return new Date(data).toLocaleDateString("it-IT");
  }

  function soloDataLocale(data) {
    const d = new Date(data);

    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  const oggi = soloDataLocale(new Date());

  const scadute = attivita.filter(
    a => soloDataLocale(a.scadenza) < oggi
  );

  const oggiDaFare = attivita.filter(
    a => soloDataLocale(a.scadenza) === oggi
  );

  const prossime = attivita.filter(
    a => soloDataLocale(a.scadenza) > oggi
  );

  const daGestire = [...scadute, ...oggiDaFare];

  const attivitaVisualizzate =
  filtro === "SCADUTE"
    ? scadute
    : filtro === "OGGI"
      ? oggiDaFare
      : filtro === "PROSSIME"
        ? prossime
        : daGestire;

if (cantinaSilenteAperta !== null) {
  return (
    <SchedaCantina
      cantinaId={cantinaSilenteAperta}
      onChiudi={() => {
        setCantinaSilenteAperta(null);
        caricaAttivita();
        caricaCantineSilenti();
      }}
    />
  );
}

 if (attivitaAperta !== null) {
  return (
    <SchedaCantina
      cantinaId={attivitaAperta.cantina_id}
      attivita={attivitaAperta}
      onChiudi={() => {
        setAttivitaAperta(null);
        caricaAttivita();
      }}
    />
  );
}

  if (loading) {
    return <p className="crm-dashboard__loading" role="status">Caricamento attività...</p>;
  }

  return (
    <main className="crm-dashboard">
      <div className="crm-dashboard__page-heading">
        <h2
          onClick={() => setFiltro("DA_GESTIRE")}
          title="Mostra tutte le attività da gestire"
        >
          Dashboard
        </h2>
      </div>

      {errore && (
        <p className="crm-dashboard__error" role="alert">
          {errore}
        </p>
      )}

      <div className="crm-dashboard__metrics" role="group" aria-label="Riepilogo e filtri Dashboard">
        <button
          type="button"
          className="crm-dashboard__metric crm-dashboard__metric--silent"
          aria-pressed={filtro === "SILENTI"}
          onClick={() => setFiltro(filtro === "SILENTI" ? "DA_GESTIRE" : "SILENTI")}
        >
          <span className="crm-dashboard__metric-label">CANTINE SILENTI</span>
          <strong className="crm-dashboard__metric-value">{cantineSilenti.length}</strong>
          <span className="crm-dashboard__metric-description">
            {filtro === "SILENTI" ? "Nascondi elenco" : "Mostra elenco"}
          </span>
        </button>

        <button
          type="button"
          className="crm-dashboard__metric crm-dashboard__metric--overdue"
          aria-pressed={filtro === "SCADUTE"}
          onClick={() => setFiltro("SCADUTE")}
        >
          <span className="crm-dashboard__metric-label">SCADUTE</span>
          <strong className="crm-dashboard__metric-value">{scadute.length}</strong>
          <span className="crm-dashboard__metric-description">Attività oltre la scadenza</span>
        </button>

        <button
          type="button"
          className="crm-dashboard__metric crm-dashboard__metric--today"
          aria-pressed={filtro === "OGGI"}
          onClick={() => setFiltro("OGGI")}
        >
          <span className="crm-dashboard__metric-label">DA FARE OGGI</span>
          <strong className="crm-dashboard__metric-value">{oggiDaFare.length}</strong>
          <span className="crm-dashboard__metric-description">Con scadenza oggi</span>
        </button>

        <button
          type="button"
          className="crm-dashboard__metric crm-dashboard__metric--upcoming"
          aria-pressed={filtro === "PROSSIME"}
          onClick={() => setFiltro("PROSSIME")}
        >
          <span className="crm-dashboard__metric-label">PROSSIME</span>
          <strong className="crm-dashboard__metric-value">{prossime.length}</strong>
          <span className="crm-dashboard__metric-description">Con scadenza futura</span>
        </button>
      </div>

      {filtro === "SILENTI" && (
        <section className="crm-dashboard__section">
          <div className="crm-dashboard__section-heading">
            <h3>Elenco cantine silenti</h3>
            <span className="crm-dashboard__section-count">
              {cantineSilenti.length} cantine
            </span>
          </div>

          {cantineSilenti.length === 0 ? (
            <p className="crm-dashboard__empty" role="status">
              Nessuna cantina silente.
            </p>
          ) : (
            <div className="crm-data-table-wrap">
              <table className="crm-data-table crm-dashboard__table crm-dashboard__table--silent">
                <thead>
                  <tr>
                    <th scope="col">CANTINA</th>
                    <th scope="col">ULTIMO CONTATTO</th>
                    <th scope="col">AZIONE</th>
                  </tr>
                </thead>
                <tbody>
                  {cantineSilenti.map((cantina) => (
                    <tr key={cantina.id}>
                      <td>{cantina.nome_portale}</td>
                      <td>
                        {cantina.ultimo_contatto ? (
                          dataLocale(cantina.ultimo_contatto)
                        ) : (
                          <span className="crm-status crm-status--silent">
                            Mai contattata
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setCantinaSilenteAperta(cantina.id)}
                        >
                          SCHEDA
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {filtro !== "SILENTI" && (
        <section className="crm-dashboard__section">
          <div className="crm-dashboard__section-heading">
            <h3>Attività da gestire</h3>
            <span className="crm-dashboard__section-count">
              {attivitaVisualizzate.length} attività
            </span>
          </div>

          {attivitaVisualizzate.length === 0 ? (
            <p className="crm-dashboard__empty" role="status">
              {filtro === "SCADUTE"
                ? "Nessuna attività scaduta."
                : filtro === "OGGI"
                  ? "Nessuna attività da fare oggi."
                  : filtro === "PROSSIME"
                    ? "Nessuna attività prossima."
                    : "Nessuna attività scaduta o prevista per oggi."}
            </p>
          ) : (
            <div className="crm-data-table-wrap">
              <table className="crm-data-table crm-dashboard__table crm-dashboard__table--activities">
                <thead>
                  <tr>
                    <th scope="col">SCADENZA</th>
                    <th scope="col">CANTINA</th>
                    <th scope="col">ATTIVITÀ</th>
                    <th scope="col">AZIONE</th>
                  </tr>
                </thead>
                <tbody>
                  {attivitaVisualizzate.map((a) => {
                    const dataScadenza = soloDataLocale(a.scadenza);
                    const statoScadenza =
                      dataScadenza < oggi
                        ? "overdue"
                        : dataScadenza === oggi
                          ? "today"
                          : "upcoming";
                    const etichettaScadenza =
                      statoScadenza === "overdue"
                        ? "SCADUTA"
                        : statoScadenza === "today"
                          ? "OGGI"
                          : "FUTURA";

                    return (
                      <tr key={a.id}>
                        <td>
                          {dataLocale(a.scadenza)}{" "}
                          <span className={`crm-status crm-status--${statoScadenza}`}>
                            {etichettaScadenza}
                          </span>
                        </td>
                        <td>{a.crm_cantine?.nome_portale || "—"}</td>
                        <td>{a.descrizione}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setAttivitaAperta(a)}
                          >
                            SCHEDA
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
