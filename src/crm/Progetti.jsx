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

  const stileCella = {
    padding: "7px 9px",
    fontSize: 12,
    textAlign: "left",
    borderBottom: "1px solid #e2e8f0",
    verticalAlign: "top"
  };

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

  if (loading) return <p>Caricamento progetti...</p>;

  if (errore) {
    return <p style={{ color: "red" }}>{errore}</p>;
  }

  if (progettoSelezionato) {
    const stilePulsante = {
      padding: "5px 10px",
      fontSize: 12,
      marginBottom: 12
    };
    const gruppi = STATI_PRESENTAZIONE.map((stato) => ({
      stato,
      assegnazioni: assegnazioniDettaglio.filter(
        (assegnazione) => assegnazione.stato_presentazione === stato
      )
    }));

    return (
      <section style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() => setProgettoSelezionatoId(null)}
          style={stilePulsante}
        >
          ← INDIETRO AI PROGETTI
        </button>

        <h2 style={{ margin: "0 0 8px" }}>
          {progettoSelezionato.nome || "Progetto senza nome"}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "6px 16px",
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 6,
            fontSize: 12,
            marginBottom: 16,
            background: "#fff"
          }}
        >
          <div>
            <strong>Stato:</strong> {statoProgetto(progettoSelezionato)}
          </div>
          <div>
            <strong>Cantine assegnate:</strong> {assegnazioniDettaglio.length}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <strong>Descrizione:</strong> {progettoSelezionato.descrizione || "—"}
          </div>
        </div>

        {loadingDettaglio ? (
          <p>Caricamento cantine assegnate...</p>
        ) : erroreDettaglio ? (
          <p style={{ color: "red" }}>{erroreDettaglio}</p>
        ) : (
          <>
            {assegnazioniDettaglio.length === 0 && (
              <p>Nessuna cantina assegnata a questo progetto.</p>
            )}

            {gruppi.map((gruppo) => (
              <section key={gruppo.stato} style={{ marginBottom: 18 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>
                  {gruppo.stato} ({gruppo.assegnazioni.length})
                </h3>

                {gruppo.assegnazioni.length === 0 ? (
                  assegnazioniDettaglio.length > 0 && (
                    <p style={{ fontSize: 12 }}>
                      Nessuna cantina in questo stato.
                    </p>
                  )
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        background: "#fff"
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={stileCella}>Ragione sociale</th>
                          <th style={stileCella}>Stato presentazione</th>
                          {progettoSelezionato.monitora_adesioni && (
                            <th style={stileCella}>Stato adesione</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {gruppo.assegnazioni.map((assegnazione) => (
                          <tr key={assegnazione.id}>
                            <td style={stileCella}>
                              {assegnazione.ragioneSociale}
                            </td>
                            <td style={stileCella}>
                              {assegnazione.stato_presentazione}
                            </td>
                            {progettoSelezionato.monitora_adesioni && (
                              <td style={stileCella}>
                                {assegnazione.stato_adesione || "—"}
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
    <section style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12
        }}
      >
        <h2 style={{ margin: 0 }}>Progetti</h2>
        <button
          type="button"
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
        <p role="status" style={{ color: "#166534" }}>
          {messaggioSuccesso}
        </p>
      )}
      {erroreCreazione && (
        <p role="alert" style={{ color: "red", whiteSpace: "pre-wrap" }}>
          {erroreCreazione}
        </p>
      )}

      {moduloNuovoAperto && (
        <form
          onSubmit={salvaNuovoProgetto}
          style={{
            display: "grid",
            gap: 10,
            maxWidth: 560,
            marginBottom: 16,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 6,
            background: "#fff"
          }}
        >
          <label style={{ display: "grid", gap: 4 }}>
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
          <label style={{ display: "grid", gap: 4 }}>
            Descrizione
            <textarea
              value={descrizioneNuovoProgetto}
              onChange={(event) =>
                setDescrizioneNuovoProgetto(event.target.value)
              }
              rows={3}
            />
          </label>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend>Monitoraggio adesioni</legend>
            <label style={{ marginRight: 16 }}>
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
          <div style={{ display: "flex", gap: 8 }}>
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
        <p>Nessun progetto disponibile.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#fff"
            }}
          >
            <thead>
              <tr>
                <th style={stileCella}>Nome</th>
                <th style={stileCella}>Descrizione</th>
                <th style={stileCella}>Stato</th>
                <th style={stileCella}>Monitora adesioni</th>
                <th style={stileCella}>Data creazione</th>
                <th style={stileCella}>Cantine assegnate</th>
              </tr>
            </thead>
            <tbody>
              {progetti.map((progetto) => (
                <tr key={progetto.id}>
                  <td style={stileCella}>
                    <button
                      type="button"
                      onClick={() =>
                        setProgettoSelezionatoId(String(progetto.id))
                      }
                      style={{
                        border: 0,
                        padding: 0,
                        background: "transparent",
                        color: "#1d4ed8",
                        font: "inherit",
                        fontWeight: 600,
                        textAlign: "left",
                        textDecoration: "underline"
                      }}
                    >
                      {progetto.nome || "Progetto senza nome"}
                    </button>
                  </td>
                  <td style={{ ...stileCella, minWidth: 220 }}>
                    {progetto.descrizione || "—"}
                  </td>
                  <td style={stileCella}>{statoProgetto(progetto)}</td>
                  <td style={stileCella}>
                    {progetto.monitora_adesioni ? "Sì" : "No"}
                  </td>
                  <td style={{ ...stileCella, whiteSpace: "nowrap" }}>
                    {formattaDataCreazione(progetto)}
                  </td>
                  <td style={{ ...stileCella, textAlign: "right" }}>
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
