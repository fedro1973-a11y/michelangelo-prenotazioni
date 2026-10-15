import { useEffect, useRef, useState } from "react";
import { crmSupabase } from "./supabase";

const DIMENSIONE_PAGINA = 1000;
const DIMENSIONE_BLOCCO_CANTINE = 500;
const STATI_PRESENTAZIONE = [
  "DA PRESENTARE",
  "IN CORSO DI PRESENTAZIONE",
  "PRESENTATO"
];

async function caricaAssegnazioni(progettoId) {
  const assegnazioni = [];

  for (let inizio = 0; ; inizio += DIMENSIONE_PAGINA) {
    let query = crmSupabase
      .from("crm_cantina_progetti")
      .select(
        "id, progetto_id, cantina_id, stato_presentazione, stato_adesione"
      );

    if (progettoId !== undefined && progettoId !== null) {
      query = query.eq("progetto_id", progettoId);
    }

    const { data, error } = await query
      .order("id", { ascending: true })
      .range(inizio, inizio + DIMENSIONE_PAGINA - 1);

    if (error) throw error;

    assegnazioni.push(...(data ?? []));

    if (!data || data.length < DIMENSIONE_PAGINA) break;
  }

  return assegnazioni;
}

async function caricaRagioniSociali(cantinaIds) {
  const ragioniSociali = new Map();

  for (
    let inizio = 0;
    inizio < cantinaIds.length;
    inizio += DIMENSIONE_BLOCCO_CANTINE
  ) {
    const bloccoIds = cantinaIds.slice(
      inizio,
      inizio + DIMENSIONE_BLOCCO_CANTINE
    );
    const { data, error } = await crmSupabase
      .from("crm_cantine")
      .select("id, ragione_sociale")
      .in("id", bloccoIds);

    if (error) throw error;

    for (const cantina of data ?? []) {
      ragioniSociali.set(String(cantina.id), cantina.ragione_sociale);
    }
  }

  return ragioniSociali;
}

async function caricaDettaglioProgetto(progettoId) {
  const assegnazioni = await caricaAssegnazioni(progettoId);
  const cantinaIds = [
    ...new Set(assegnazioni.map((assegnazione) => String(assegnazione.cantina_id)))
  ];
  const ragioniSociali = await caricaRagioniSociali(cantinaIds);

  return assegnazioni
    .map((assegnazione) => ({
      ...assegnazione,
      ragioneSociale:
        ragioniSociali.get(String(assegnazione.cantina_id)) ||
        `Cantina #${assegnazione.cantina_id}`
    }))
    .sort((a, b) => a.ragioneSociale.localeCompare(b.ragioneSociale, "it"));
}

function formattaDataCreazione(progetto) {
  const valore =
    progetto.created_at ??
    progetto.creato_il ??
    progetto.data_creazione;

  if (!valore) return "—";

  const data = new Date(valore);
  if (Number.isNaN(data.getTime())) return "—";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Rome"
  }).format(data);
}

function statoProgetto(progetto) {
  if (progetto.concluso_il) return "CONCLUSO";
  return progetto.attivo ? "ATTIVO" : "INATTIVO";
}

function classeStatoProgetto(progetto) {
  return statoProgetto(progetto) === "ATTIVO" ? "active" : "closed";
}

function classeStatoPresentazione(stato) {
  if (stato === "PRESENTATO") return "active";
  if (stato === "IN CORSO DI PRESENTAZIONE") return "progress";
  return "new";
}

function classeStatoAdesione(stato) {
  if (stato === "ADERITO") return "active";
  if (stato === "NON ADERITO") return "not-interested";
  return "closed";
}

async function caricaElencoProgetti() {
  const [risultatoProgetti, assegnazioni] = await Promise.all([
    crmSupabase
      .from("crm_progetti")
      .select("*")
      .order("nome", { ascending: true })
      .order("id", { ascending: true }),
    caricaAssegnazioni()
  ]);

  if (risultatoProgetti.error) throw risultatoProgetti.error;

  const conteggi = new Map();
  for (const assegnazione of assegnazioni) {
    const progettoId = String(assegnazione.progetto_id);
    conteggi.set(progettoId, (conteggi.get(progettoId) ?? 0) + 1);
  }

  return (risultatoProgetti.data ?? []).map((progetto) => ({
    ...progetto,
    cantineAssegnate: conteggi.get(String(progetto.id)) ?? 0
  }));
}

export default function Progetti() {
  const [progetti, setProgetti] = useState([]);
  const [progettoSelezionatoId, setProgettoSelezionatoId] = useState(null);
  const [assegnazioniDettaglio, setAssegnazioniDettaglio] = useState([]);
  const [loadingDettaglio, setLoadingDettaglio] = useState(false);
  const [erroreDettaglio, setErroreDettaglio] = useState("");
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState("");
  const [moduloNuovoAperto, setModuloNuovoAperto] = useState(false);
  const [nomeNuovoProgetto, setNomeNuovoProgetto] = useState("");
  const [descrizioneNuovoProgetto, setDescrizioneNuovoProgetto] = useState("");
  const [monitoraAdesioni, setMonitoraAdesioni] = useState(false);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  const [erroreCreazione, setErroreCreazione] = useState("");
  const [messaggioSuccesso, setMessaggioSuccesso] = useState("");
  const invioInCorsoRef = useRef(false);

  const progettoSelezionato = progetti.find(
    (progetto) => String(progetto.id) === progettoSelezionatoId
  );

  useEffect(() => {
    let active = true;

    async function caricaProgetti() {
      setLoading(true);
      setErrore("");

      try {
        const progettiCaricati = await caricaElencoProgetti();
        if (!active) return;
        setProgetti(progettiCaricati);
      } catch (err) {
        console.error("Errore caricamento progetti:", err);
        if (active) {
          setErrore("Impossibile caricare i progetti.");
          setProgetti([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    caricaProgetti();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (progettoSelezionatoId === null) return undefined;

    let active = true;

    async function caricaDettaglio() {
      setLoadingDettaglio(true);
      setErroreDettaglio("");
      setAssegnazioniDettaglio([]);

      try {
        const assegnazioni = await caricaDettaglioProgetto(
          progettoSelezionatoId
        );
        if (!active) return;
        setAssegnazioniDettaglio(assegnazioni);
      } catch (err) {
        console.error("Errore caricamento assegnazioni progetto:", err);
        if (active) {
          setErroreDettaglio("Impossibile caricare le cantine assegnate.");
        }
      } finally {
        if (active) setLoadingDettaglio(false);
      }
    }

    caricaDettaglio();
    return () => {
      active = false;
    };
  }, [progettoSelezionatoId]);

  async function salvaNuovoProgetto(event) {
    event.preventDefault();
    if (invioInCorsoRef.current) return;

    const nome = nomeNuovoProgetto.trim();
    if (!nome) {
      setErroreCreazione("Inserisci il nome del progetto.");
      return;
    }

    invioInCorsoRef.current = true;
    setSalvataggioInCorso(true);
    setErroreCreazione("");
    setMessaggioSuccesso("");

    try {
      const { error: erroreInserimento } = await crmSupabase.rpc(
        "crm_crea_progetto_con_assegnazioni",
        {
          p_nome: nome,
          p_descrizione: descrizioneNuovoProgetto.trim() || null,
          p_monitora_adesioni: monitoraAdesioni
        }
      );

      if (erroreInserimento) throw erroreInserimento;

      setMessaggioSuccesso("Progetto creato e assegnato alle cantine attive.");
      setModuloNuovoAperto(false);
      setNomeNuovoProgetto("");
      setDescrizioneNuovoProgetto("");
      setMonitoraAdesioni(false);

      try {
        setProgetti(await caricaElencoProgetti());
      } catch (err) {
        console.error("Errore aggiornamento elenco progetti:", err);
        setErroreCreazione(
          "Progetto creato, ma non è stato possibile aggiornare l'elenco."
        );
      }
    } catch (err) {
      console.error("Errore creazione progetto:", err);
      const dettagliErrore = [
        err?.message || String(err),
        err?.code && `Codice: ${err.code}`,
        err?.details && `Dettagli: ${err.details}`,
        err?.hint && `Suggerimento: ${err.hint}`
      ].filter(Boolean);
      setErroreCreazione(dettagliErrore.join("\n"));
    } finally {
      invioInCorsoRef.current = false;
      setSalvataggioInCorso(false);
    }
  }

  if (loading) {
    return <p className="crm-projects__loading" role="status">Caricamento progetti...</p>;
  }

  if (errore) {
    return <p className="crm-projects__error" role="alert">{errore}</p>;
  }

  if (progettoSelezionato) {
    const gruppi = STATI_PRESENTAZIONE.map((stato) => ({
      stato,
      assegnazioni: assegnazioniDettaglio.filter(
        (assegnazione) => assegnazione.stato_presentazione === stato
      )
    }));

    return (
      <section className="crm-projects">
        <button
          type="button"
          onClick={() => setProgettoSelezionatoId(null)}
          className="crm-projects__back"
        >
          ← Tutti i progetti
        </button>

        <div className="crm-projects__detail-header">
          <h2>{progettoSelezionato.nome || "Progetto senza nome"}</h2>
          <span className={`crm-status crm-status--${classeStatoProgetto(progettoSelezionato)}`}>
            {statoProgetto(progettoSelezionato)}
          </span>
        </div>

        <div className="crm-projects__summary">
          <div className="crm-projects__summary-item">
            <span className="crm-projects__summary-label">Cantine assegnate</span>
            <strong>{assegnazioniDettaglio.length}</strong>
          </div>
          <div className="crm-projects__summary-item">
            <span className="crm-projects__summary-label">Monitora adesioni</span>
            <strong>{progettoSelezionato.monitora_adesioni ? "Sì" : "No"}</strong>
          </div>
          <div className="crm-projects__summary-item crm-projects__summary-item--description">
            <span className="crm-projects__summary-label">Descrizione</span>
            <p>{progettoSelezionato.descrizione || "—"}</p>
          </div>
        </div>

        {loadingDettaglio ? (
          <p className="crm-projects__loading" role="status">Caricamento cantine assegnate...</p>
        ) : erroreDettaglio ? (
          <p className="crm-projects__error" role="alert">{erroreDettaglio}</p>
        ) : (
          <>
            {assegnazioniDettaglio.length === 0 && (
              <p className="crm-projects__empty">Nessuna cantina assegnata a questo progetto.</p>
            )}

            {gruppi.map((gruppo) => (
              <section key={gruppo.stato} className="crm-projects__group">
                <div className="crm-projects__group-heading">
                  <h3>
                    <span className={`crm-status crm-status--${classeStatoPresentazione(gruppo.stato)}`}>
                      {gruppo.stato}
                    </span>
                  </h3>
                  <span className="crm-projects__group-count">
                    {gruppo.assegnazioni.length} cantine
                  </span>
                </div>

                {gruppo.assegnazioni.length === 0 ? (
                  assegnazioniDettaglio.length > 0 && (
                    <p className="crm-projects__empty crm-projects__empty--group">
                      Nessuna cantina in questo stato.
                    </p>
                  )
                ) : (
                  <div className="crm-data-table-wrap">
                    <table className="crm-data-table crm-projects__table">
                      <thead>
                        <tr>
                          <th scope="col">Ragione sociale</th>
                          <th scope="col">Stato presentazione</th>
                          {progettoSelezionato.monitora_adesioni && (
                            <th scope="col">Stato adesione</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {gruppo.assegnazioni.map((assegnazione) => (
                          <tr key={assegnazione.id}>
                            <td>
                              {assegnazione.ragioneSociale}
                            </td>
                            <td>
                              <span className={`crm-status crm-status--${classeStatoPresentazione(assegnazione.stato_presentazione)}`}>
                                {assegnazione.stato_presentazione}
                              </span>
                            </td>
                            {progettoSelezionato.monitora_adesioni && (
                              <td>
                                {assegnazione.stato_adesione ? (
                                  <span className={`crm-status crm-status--${classeStatoAdesione(assegnazione.stato_adesione)}`}>
                                    {assegnazione.stato_adesione}
                                  </span>
                                ) : "—"}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </>
        )}
      </section>
    );
  }

  return (
    <section className="crm-projects">
      <div className="crm-projects__header">
        <div className="crm-projects__page-title">
          <h2>Progetti</h2>
          <span>{progetti.length} progetti</span>
        </div>
        <button
          type="button"
          className="crm-button--primary"
          onClick={() => {
            setErroreCreazione("");
            setMessaggioSuccesso("");
            setModuloNuovoAperto((aperto) => !aperto);
          }}
        >
          {moduloNuovoAperto ? "ANNULLA" : "NUOVO PROGETTO"}
        </button>
      </div>

      {messaggioSuccesso && (
        <p role="status" className="crm-projects__notice crm-projects__notice--success">
          {messaggioSuccesso}
        </p>
      )}
      {erroreCreazione && (
        <p role="alert" className="crm-projects__notice crm-projects__notice--error">
          {erroreCreazione}
        </p>
      )}

      {moduloNuovoAperto && (
        <form
          onSubmit={salvaNuovoProgetto}
          className="crm-projects__form"
        >
          <label className="crm-projects__field">
            Nome <span aria-hidden="true">*</span>
            <input
              autoFocus
              required
              value={nomeNuovoProgetto}
              onChange={(event) => {
                setNomeNuovoProgetto(event.target.value);
                setErroreCreazione("");
              }}
              maxLength={200}
            />
          </label>
          <label className="crm-projects__field">
            Descrizione
            <textarea
              value={descrizioneNuovoProgetto}
              onChange={(event) =>
                setDescrizioneNuovoProgetto(event.target.value)
              }
              rows={3}
            />
          </label>
          <fieldset className="crm-projects__monitoring">
            <legend>Monitoraggio adesioni</legend>
            <label>
              <input
                type="radio"
                name="monitora-adesioni"
                checked={!monitoraAdesioni}
                onChange={() => setMonitoraAdesioni(false)}
              />
              No
            </label>
            <label>
              <input
                type="radio"
                name="monitora-adesioni"
                checked={monitoraAdesioni}
                onChange={() => setMonitoraAdesioni(true)}
              />
              Sì
            </label>
          </fieldset>
          <div className="crm-projects__form-actions">
            <button type="submit" disabled={salvataggioInCorso}>
              {salvataggioInCorso ? "SALVATAGGIO..." : "CREA PROGETTO"}
            </button>
            <button
              type="button"
              disabled={salvataggioInCorso}
              onClick={() => setModuloNuovoAperto(false)}
            >
              ANNULLA
            </button>
          </div>
        </form>
      )}

      {progetti.length === 0 ? (
        <p className="crm-projects__empty">Nessun progetto disponibile.</p>
      ) : (
        <div className="crm-data-table-wrap">
          <table className="crm-data-table crm-projects__table crm-projects__list-table">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Descrizione</th>
                <th scope="col">Stato</th>
                <th scope="col">Monitora adesioni</th>
                <th scope="col">Data creazione</th>
                <th scope="col">Cantine assegnate</th>
              </tr>
            </thead>
            <tbody>
              {progetti.map((progetto) => (
                <tr key={progetto.id}>
                  <td className="crm-projects__name-cell">
                    <button
                      type="button"
                      className="crm-projects__name-link"
                      onClick={() =>
                        setProgettoSelezionatoId(String(progetto.id))
                      }
                    >
                      {progetto.nome || "Progetto senza nome"}
                    </button>
                  </td>
                  <td className="crm-projects__description-cell">
                    {progetto.descrizione || "—"}
                  </td>
                  <td>
                    <span className={`crm-status crm-status--${classeStatoProgetto(progetto)}`}>
                      {statoProgetto(progetto)}
                    </span>
                  </td>
                  <td>
                    {progetto.monitora_adesioni ? "Sì" : "No"}
                  </td>
                  <td className="crm-projects__date-cell">
                    {formattaDataCreazione(progetto)}
                  </td>
                  <td className="crm-projects__count-cell">
                    {progetto.cantineAssegnate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
