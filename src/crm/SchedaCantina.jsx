
import { useEffect, useRef, useState } from "react";
import { crmSupabase } from "./supabase";
import NuovaCantina from "./NuovaCantina";
import Contatto from "./Contatto";

function formattaData(valore) {
  if (!valore) return "—";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Rome"
  }).format(new Date(valore));
}

function classeStatoCantina(stato) {
  if (stato === "ATTIVO") return "active";
  if (stato === "NUOVO") return "new";
  if (stato === "IN TRATTATIVA") return "progress";
  if (stato === "NON INTERESSATO") return "not-interested";
  return "closed";
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

export default function SchedaCantina({
  cantinaId,
  attivita = null,
  onChiudi
})  {
  const [cantina, setCantina] = useState(null);
  const [contatti, setContatti] = useState([]);
  const [vista, setVista] = useState("");
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState("");
  const [aggiornamento, setAggiornamento] = useState(0);
  const [riprogramma, setRiprogramma] = useState(false);
  const [nuovaScadenza, setNuovaScadenza] = useState("");
  const [contattoDettaglio, setContattoDettaglio] = useState(null);
  const [dettaglioStorico, setDettaglioStorico] = useState(null);
  const [caricamentoDettaglio, setCaricamentoDettaglio] = useState(false);
  const richiestaDettaglio = useRef(0);

  useEffect(() => {
    let active = true;

    async function carica() {
      setLoading(true);
      setErrore("");

      const [risCantina, risContatti] = await Promise.all([
        crmSupabase
          .from("crm_cantine")
          .select("*")
          .eq("id", cantinaId)
          .single(),

        crmSupabase
          .from("crm_contatti")
          .select(
            "id, data_contatto, canale, interlocutore, sintesi, aggiornamento_prodotti, progetto_id"
          )
          .eq("cantina_id", cantinaId)
          .order("data_contatto", { ascending: false })
          .order("id", { ascending: false })
      ]);

      if (!active) return;

      if (risCantina.error || risContatti.error) {
        setErrore("Impossibile caricare la scheda cantina.");
      } else {
        setCantina(risCantina.data);
        setContatti(risContatti.data ?? []);
      }

      setLoading(false);
    }

    carica();

    return () => {
      active = false;
    };
  }, [cantinaId, aggiornamento]);

  function salvato() {
    setVista("");
    setAggiornamento((precedente) => precedente + 1);
  }

  async function apriDettaglioContatto(contatto) {
    const richiesta = ++richiestaDettaglio.current;
    setContattoDettaglio(contatto);
    setDettaglioStorico(null);
    setCaricamentoDettaglio(true);
    setVista("dettaglio");

    const richieste = [
      crmSupabase
        .from("crm_progetti_eventi")
        .select("tipo_evento, valore_nuovo, changed_at")
        .eq("contatto_id", contatto.id)
        .in("tipo_evento", ["PRESENTAZIONE", "ADESIONE"])
        .order("changed_at", { ascending: true }),
      contatto.progetto_id
        ? crmSupabase
            .from("crm_progetti")
            .select("id, nome")
            .eq("id", contatto.progetto_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ];

    const [risultatoEventi, risultatoProgetto] = await Promise.all(richieste);
    if (richiesta !== richiestaDettaglio.current) return;

    if (risultatoEventi.error) {
      console.error("Errore caricamento stati storici contatto:", risultatoEventi.error);
    }
    if (risultatoProgetto.error) {
      console.error("Errore caricamento progetto contatto:", risultatoProgetto.error);
    }

    const stati = {
      presentazione: null,
      adesione: null
    };

    for (const evento of risultatoEventi.data ?? []) {
      if (evento.tipo_evento === "PRESENTAZIONE") {
        stati.presentazione = evento.valore_nuovo;
      } else if (evento.tipo_evento === "ADESIONE") {
        stati.adesione = evento.valore_nuovo;
      }
    }

    setDettaglioStorico({
      progetto: risultatoProgetto.data,
      ...stati
    });
    setCaricamentoDettaglio(false);
  }

  function chiudiDettaglioContatto() {
    richiestaDettaglio.current += 1;
    setVista("");
    setContattoDettaglio(null);
    setDettaglioStorico(null);
    setCaricamentoDettaglio(false);
  }

 function completaAttivita() {
  if (!attivita) return;

  setRiprogramma(false);
  setVista("contatto");
}

async function salvaNuovaScadenza() {
  if (!attivita || !nuovaScadenza) return;

  const { error } = await crmSupabase
    .from("crm_attivita")
    .update({
      scadenza: `${nuovaScadenza}T12:00:00+02:00`
    })
    .eq("id", attivita.id);

  if (error) {
    console.error(error);
    window.alert("Errore durante la riprogrammazione dell'attività.");
    return;
  }

  onChiudi();
}

  if (loading) {
    return <p className="crm-scheda__feedback" role="status">Caricamento scheda...</p>;
  }

  if (errore) {
    return (
      <div className="crm-scheda__feedback-wrap">
        <p className="crm-scheda__feedback crm-scheda__feedback--error" role="alert">{errore}</p>
        <button type="button" className="crm-scheda__back" onClick={onChiudi}>← Indietro</button>
      </div>
    );
  }

  if (!cantina) {
    return <p className="crm-scheda__feedback" role="status">Cantina non trovata.</p>;
  }

  return (
  <section className="crm-scheda">

    {attivita && (
      <div className="crm-scheda__activity">
        <strong className="crm-scheda__activity-title">ATTIVITÀ DA GESTIRE</strong>

        <div className="crm-scheda__activity-actions">
  {!riprogramma ? (
    <div className="crm-scheda__action-buttons">
      <button
        type="button"
        onClick={completaAttivita}
      >
        COMPLETA ATTIVITÀ
      </button>

      <button
        type="button"
        onClick={() => setRiprogramma(true)}
      >
        RIPROGRAMMA
      </button>
    </div>
  ) : (
    <div className="crm-scheda__reschedule">
      <input
        type="date"
        value={nuovaScadenza}
        onChange={(e) => setNuovaScadenza(e.target.value)}
      />

      <button
        type="button"
        onClick={salvaNuovaScadenza}
        disabled={!nuovaScadenza}
      >
        SALVA NUOVA DATA
      </button>

      <button
        type="button"
        onClick={() => {
          setRiprogramma(false);
          setNuovaScadenza("");
        }}
      >
        ANNULLA
      </button>
    </div>
  )}
</div>
      </div>
    )}

      <div className="crm-scheda__header">
        <div className="crm-scheda__identity">
          <button
            type="button"
            onClick={onChiudi}
            className="crm-scheda__back"
          >
            ← Indietro
          </button>

          <div className="crm-scheda__title">
            <h2>{cantina.nome_portale || cantina.ragione_sociale}</h2>
            <span className={`crm-status crm-status--${classeStatoCantina(cantina.stato)}`}>
              {cantina.stato}
            </span>
          </div>
        </div>

        {vista !== "dettaglio" && (
          <div className="crm-scheda__actions">
            <button
              type="button"
              className="crm-scheda__secondary-action"
              onClick={() =>
                setVista(vista === "modifica" ? "" : "modifica")
              }
            >
              MODIFICA
            </button>

            <button
              type="button"
              className="crm-button--primary"
              onClick={() =>
                setVista(vista === "contatto" ? "" : "contatto")
              }
            >
              + CONTATTO
            </button>
          </div>
        )}
      </div>

      <div className="crm-scheda__info">
        <div className="crm-scheda__info-item">
          <span>ID Portale</span>
          <strong>{cantina.id_portale || "—"}</strong>
        </div>

        <div className="crm-scheda__info-item">
          <span>P. IVA</span>
          <strong>{cantina.partita_iva || "—"}</strong>
        </div>

        <div className="crm-scheda__info-item">
          <span>Ragione sociale</span>
          <strong>{cantina.ragione_sociale || "—"}</strong>
        </div>

        <div className="crm-scheda__info-item">
          <span>Città</span>
          <strong>{cantina.citta || "—"}</strong>
        </div>

        <div className="crm-scheda__info-item">
          <span>Provincia</span>
          <strong>{cantina.provincia || "—"}</strong>
        </div>

        <div className="crm-scheda__info-item">
          <span>Regione</span>
          <strong>{cantina.regione || "—"}</strong>
        </div>

        <div className="crm-scheda__info-item">
          <span>Referente</span>
          <strong>{cantina.referente || "—"}</strong>
        </div>

        <div className="crm-scheda__info-item">
          <span>Cellulare</span>
          <strong>{cantina.cellulare || "—"}</strong>
        </div>

        <div className="crm-scheda__info-item">
          <span>Telefono</span>
          <strong>{cantina.telefono || "—"}</strong>
        </div>

        <div className="crm-scheda__info-item">
          <span>Email</span>
          <strong>{cantina.email || "—"}</strong>
        </div>

        <div className="crm-scheda__info-item crm-scheda__info-item--address">
          <span>Indirizzo</span>
          <strong>{cantina.indirizzo || "—"}</strong>
        </div>
      </div>

      {vista && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 6,
            padding: 12,
            marginBottom: 10,
            background: "#f8fafc"
          }}
        >
          {vista === "modifica" ? (
            <NuovaCantina
              cantina={cantina}
              onSalvata={salvato}
            />
          ) : vista === "contatto" ? (
            <Contatto
              cantina={cantina}
              attivita={attivita}
              onSalvato={attivita ? onChiudi : salvato}
              onAnnulla={() => setVista("")}
            />
          ) : (
            <section className="crm-scheda__history-detail" aria-label="Dettaglio storico contatto">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12
                }}
              >
                <h3>Dettaglio storico contatto</h3>
                <button type="button" className="crm-scheda__detail-close" onClick={chiudiDettaglioContatto}>
                  CHIUDI
                </button>
              </div>
              {caricamentoDettaglio ? (
                <p>Caricamento dettaglio...</p>
              ) : contattoDettaglio ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: "10px 16px",
                    fontSize: 13
                  }}
                >
                  <div>
                    <strong>Data contatto</strong>
                    <div>{formattaData(contattoDettaglio.data_contatto)}</div>
                  </div>
                  <div>
                    <strong>Canale</strong>
                    <div>{contattoDettaglio.canale || "Non registrato"}</div>
                  </div>
                  <div>
                    <strong>Interlocutore</strong>
                    <div>{contattoDettaglio.interlocutore || "Non registrato"}</div>
                  </div>
                  <div>
                    <strong>Prodotti aggiornati</strong>
                    <div>
                      {contattoDettaglio.aggiornamento_prodotti == null
                        ? "Non registrato"
                        : contattoDettaglio.aggiornamento_prodotti
                          ? "Sì"
                          : "No"}
                    </div>
                  </div>
                  <div>
                    <strong>Progetto associato</strong>
                    <div>
                      {dettaglioStorico?.progetto?.nome ||
                        (contattoDettaglio.progetto_id
                          ? `ID ${contattoDettaglio.progetto_id}`
                          : "Non registrato")}
                    </div>
                  </div>
                  <div>
                    <strong>Stato presentazione registrato</strong>
                    <div>
                      {dettaglioStorico?.presentazione ? (
                        <span className={`crm-status crm-status--${classeStatoPresentazione(dettaglioStorico.presentazione)}`}>
                          {dettaglioStorico.presentazione}
                        </span>
                      ) : "Non registrato"}
                    </div>
                  </div>
                  <div>
                    <strong>Stato adesione registrato</strong>
                    <div>
                      {dettaglioStorico?.adesione ? (
                        <span className={`crm-status crm-status--${classeStatoAdesione(dettaglioStorico.adesione)}`}>
                          {dettaglioStorico.adesione}
                        </span>
                      ) : "Non registrato"}
                    </div>
                  </div>
                  <div>
                    <strong>Richiamo collegato</strong>
                    <div>Non registrato</div>
                  </div>
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere"
                    }}
                  >
                    <strong>Sintesi completa della conversazione</strong>
                    <div>{contattoDettaglio.sintesi || "Non registrato"}</div>
                  </div>
                </div>
              ) : (
                <p>Non registrato</p>
              )}
            </section>
          )}
        </div>
      )}

      <div
        className="crm-scheda__history-heading"
      >
        <h3>Storico contatti</h3>

        <span className="crm-scheda__history-count">
          {contatti.length} registrazioni
        </span>
      </div>

      {contatti.length === 0 ? (
        <p className="crm-scheda__empty" role="status">
          Nessun contatto registrato.
        </p>
      ) : (
        <div className="crm-data-table-wrap">
          <table className="crm-data-table crm-scheda__history-table">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Tipo</th>
                <th scope="col">Canale</th>
                <th scope="col">Interlocutore</th>
                <th scope="col">Note</th>
                <th scope="col">Dettaglio</th>
              </tr>
            </thead>

            <tbody>
              {contatti.map((contatto) => (
                <tr key={contatto.id}>
                  <td className="crm-scheda__history-date">
                    {formattaData(contatto.data_contatto)}
                  </td>

                  <td>
                    <span className={`crm-status crm-status--${contatto.aggiornamento_prodotti ? "active" : "new"}`}>
                      {contatto.aggiornamento_prodotti
                        ? "PRODOTTI AGGIORNATI"
                        : "CONTATTO"}
                    </span>
                  </td>

                  <td>
                    {contatto.canale || "—"}
                  </td>

                  <td>
                    {contatto.interlocutore || "—"}
                  </td>

                  <td className="crm-scheda__history-notes">
                    {contatto.sintesi || "—"}
                  </td>

                  <td className="crm-scheda__history-action">
                    <button
                      type="button"
                      onClick={() => apriDettaglioContatto(contatto)}
                    >
                      DETTAGLIO
                    </button>
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
