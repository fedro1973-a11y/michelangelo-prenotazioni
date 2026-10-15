
import { useEffect, useState } from "react";
import { crmSupabase } from "./supabase";

const STATI_PRESENTAZIONE = [
  "DA PRESENTARE",
  "IN CORSO DI PRESENTAZIONE",
  "PRESENTATO"
];

const STATI_ADESIONE = ["DA DEFINIRE", "ADERITO", "NON ADERITO"];

function dataOggi() {
  const oggi = new Date();
  const anno = oggi.getFullYear();
  const mese = String(oggi.getMonth() + 1).padStart(2, "0");
  const giorno = String(oggi.getDate()).padStart(2, "0");

  return `${anno}-${mese}-${giorno}`;
}

export default function Contatto({
  cantina,
  attivita = null,
  onSalvato,
  onAnnulla
}) {
  const [prodotti, setProdotti] = useState(false);
  const [canale, setCanale] = useState("TELEFONO");
  const [interlocutore, setInterlocutore] = useState("");
  const [sintesi, setSintesi] = useState("");
  const [progettoId, setProgettoId] = useState("");
  const [progetti, setProgetti] = useState([]);
  const [statoPresentazione, setStatoPresentazione] = useState("");
  const [statoAdesione, setStatoAdesione] = useState("");
  const [programmaRichiamo, setProgrammaRichiamo] = useState(false);
  const [dataRichiamo, setDataRichiamo] = useState("");
  const [descrizioneRichiamo, setDescrizioneRichiamo] = useState("");
  const [saving, setSaving] = useState(false);
  const [errore, setErrore] = useState("");
  const [dataContatto, setDataContatto] = useState(dataOggi);

  useEffect(() => {
    let active = true;

    async function caricaProgetti() {
      const [risultatoProgetti, risultatoAssegnazioni] = await Promise.all([
        crmSupabase
          .from("crm_progetti")
          .select("id, nome, monitora_adesioni")
          .eq("attivo", true)
          .order("nome"),
        crmSupabase
          .from("crm_cantina_progetti")
          .select("id, progetto_id, stato_presentazione, stato_adesione")
          .eq("cantina_id", cantina.id)
      ]);

      if (!active) return;

      if (risultatoProgetti.error || risultatoAssegnazioni.error) {
        setErrore("Impossibile caricare i progetti.");
      } else {
        const assegnazioni = new Map(
          (risultatoAssegnazioni.data ?? []).map((assegnazione) => [
            String(assegnazione.progetto_id),
            assegnazione
          ])
        );
        setProgetti(
          (risultatoProgetti.data ?? []).map((progetto) => ({
            ...progetto,
            assegnazione: assegnazioni.get(String(progetto.id)) ?? null
          }))
        );
      }
    }

    caricaProgetti();
    return () => { active = false; };
  }, [cantina.id]);

  const progettoSelezionato = progetti.find(
    (progetto) => String(progetto.id) === progettoId
  );

  function selezionaProgetto(valore) {
    setProgettoId(valore);
    const progetto = progetti.find(
      (voce) => String(voce.id) === valore
    );
    setStatoPresentazione(progetto?.assegnazione?.stato_presentazione ?? "");
    setStatoAdesione(progetto?.assegnazione?.stato_adesione ?? "");
  }

  async function salva(e) {
  e.preventDefault();
  if (saving) return;

  if (!prodotti && !sintesi.trim()) {
    setErrore("Inserisci la sintesi della conversazione.");
    return;
  }

  if (
    programmaRichiamo &&
    (!dataRichiamo || !descrizioneRichiamo.trim())
  ) {
    setErrore("Inserisci data e descrizione del prossimo richiamo.");
    return;
  }

  setSaving(true);
  setErrore("");

  try {
    const assegnazione = progettoSelezionato?.assegnazione;
    const { error } = await crmSupabase.rpc(
      "crm_salva_contatto_con_stati",
      {
        p_cantina_id: cantina.id,
        p_data_contatto: new Date(
          `${dataContatto}T12:00:00`
        ).toISOString(),
        p_canale: prodotti ? "WEB" : canale,
        p_interlocutore: interlocutore.trim() || null,
        p_sintesi: sintesi.trim() || null,
        p_aggiornamento_prodotti: prodotti,
        p_progetto_id: progettoId ? Number(progettoId) : null,
        p_attivita_id: attivita?.id ?? null,
        p_nuova_scadenza: programmaRichiamo
          ? new Date(`${dataRichiamo}T12:00:00`).toISOString()
          : null,
        p_nuova_descrizione: programmaRichiamo
          ? descrizioneRichiamo.trim()
          : null,
        p_stato_presentazione:
          assegnazione &&
          statoPresentazione !== assegnazione.stato_presentazione
            ? statoPresentazione
            : null,
        p_stato_adesione:
          assegnazione &&
          progettoSelezionato.monitora_adesioni &&
          statoAdesione !== assegnazione.stato_adesione
            ? statoAdesione
            : null
      }
    );

    if (error) throw error;

    onSalvato?.();
  } catch (err) {
    console.error(err);
    setErrore("Salvataggio non riuscito. Nessuna modifica confermata.");
  } finally {
    setSaving(false);
  }
}


  return (
    <form className="crm-contatto" onSubmit={salva}>
      <header className="crm-contatto__header">
        <h3>Nuovo contatto: {cantina.ragione_sociale}</h3>
        <div className="crm-contatto__legend" aria-label="Legenda campi">
          <span><span className="crm-contatto__required-mark">*</span> Obbligatorio</span>
          <span>Facoltativo</span>
        </div>
      </header>

      <section className="crm-contatto__section" aria-labelledby="crm-contatto-info-title">
        <h4 id="crm-contatto-info-title">Informazioni del contatto</h4>
        <div className="crm-contatto__grid">
          <label className="crm-contatto__field">
            <span>Data del contatto <span className="crm-contatto__required">Obbligatoria</span></span>
            <input
              type="date"
              value={dataContatto}
              onChange={(e) => setDataContatto(e.target.value)}
              required
            />
          </label>

          <label className="crm-contatto__check">
            <input
              type="checkbox"
              checked={prodotti}
              onChange={(e) => setProdotti(e.target.checked)}
            />
            <span>Prodotti aggiornati</span>
          </label>

          {!prodotti && (
            <>
              <label className="crm-contatto__field">
                <span>Canale <span className="crm-contatto__optional">Facoltativo</span></span>
                <select
                  value={canale}
                  onChange={(e) => setCanale(e.target.value)}
                >
                  <option value="TELEFONO">Telefono</option>
                  <option value="EMAIL">Email</option>
                  <option value="DI PERSONA">Di persona</option>
                  <option value="WEB">Web</option>
                  <option value="ALTRO">Altro</option>
                </select>
              </label>

              <label className="crm-contatto__field">
                <span>Interlocutore <span className="crm-contatto__optional">Facoltativo</span></span>
                <input
                  value={interlocutore}
                  onChange={(e) => setInterlocutore(e.target.value)}
                />
              </label>
            </>
          )}

          <label className="crm-contatto__field crm-contatto__field--full">
            <span>
              {prodotti ? "Note (facoltative)" : "Sintesi della conversazione"}
              {!prodotti && <span className="crm-contatto__required">Obbligatoria</span>}
            </span>
            <textarea
              value={sintesi}
              onChange={(e) => setSintesi(e.target.value)}
              rows={3}
            />
          </label>
        </div>
      </section>

      <section className="crm-contatto__section" aria-labelledby="crm-contatto-project-title">
        <h4 id="crm-contatto-project-title">Progetto collegato e aggiornamento</h4>
        <div className="crm-contatto__grid">
          <label className="crm-contatto__field crm-contatto__field--full">
            <span>Progetto associato <span className="crm-contatto__optional">Facoltativo</span></span>
            <select
              value={progettoId}
              onChange={(e) => selezionaProgetto(e.target.value)}
            >
              <option value="">Nessun progetto</option>
              {progetti.map((progetto) => (
                <option key={progetto.id} value={progetto.id}>
                  {progetto.nome}
                </option>
              ))}
            </select>
          </label>

          {progettoSelezionato?.assegnazione && (
            <fieldset className="crm-contatto__states">
              <legend>Aggiornamento progetto in questo contatto</legend>
              <label className="crm-contatto__field">
                <span>Stato presentazione</span>
                <select
                  value={statoPresentazione}
                  onChange={(e) => setStatoPresentazione(e.target.value)}
                >
                  {STATI_PRESENTAZIONE
                    .filter(
                      (stato) =>
                        progettoSelezionato.assegnazione.stato_presentazione !==
                          "PRESENTATO" || stato === "PRESENTATO"
                    )
                    .map((stato) => (
                      <option key={stato} value={stato}>
                        {stato}
                      </option>
                    ))}
                </select>
              </label>
              {progettoSelezionato.monitora_adesioni && (
                <label className="crm-contatto__field">
                  <span>Stato adesione</span>
                  <select
                    value={statoAdesione}
                    onChange={(e) => setStatoAdesione(e.target.value)}
                    disabled={statoPresentazione !== "PRESENTATO"}
                  >
                    {STATI_ADESIONE.map((stato) => (
                      <option key={stato} value={stato}>
                        {stato}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </fieldset>
          )}
        </div>
      </section>

      <section className="crm-contatto__section crm-contatto__section--reminder" aria-labelledby="crm-contatto-reminder-title">
        <h4 id="crm-contatto-reminder-title">Attività successiva</h4>
        <label className="crm-contatto__check">
          <input
            type="checkbox"
            checked={programmaRichiamo}
            onChange={(e) => setProgrammaRichiamo(e.target.checked)}
          />
          <span>PROGRAMMA PROSSIMO RICHIAMO</span>
        </label>

        {programmaRichiamo && (
          <div className="crm-contatto__grid">
            <label className="crm-contatto__field">
              <span>Data prossimo richiamo <span className="crm-contatto__required">Obbligatoria</span></span>
              <input
                type="date"
                value={dataRichiamo}
                onChange={(e) => setDataRichiamo(e.target.value)}
                required
              />
            </label>
            <label className="crm-contatto__field crm-contatto__field--full">
              <span>Attività da svolgere <span className="crm-contatto__required">Obbligatoria</span></span>
              <textarea
                value={descrizioneRichiamo}
                onChange={(e) => setDescrizioneRichiamo(e.target.value)}
                required
                rows={2}
                placeholder="Es. Richiamare per verificare interesse"
              />
            </label>
          </div>
        )}
      </section>

      {errore && (
        <p className="crm-contatto__error" role="alert">
          {errore}
        </p>
      )}

      <div className="crm-contatto__actions">
        <button type="button" onClick={onAnnulla} disabled={saving}>
          ANNULLA
        </button>
        <button type="submit" className="crm-button--primary" disabled={saving}>
          {saving ? "Salvataggio..." : "SALVA CONTATTO"}
        </button>
      </div>
    </form>
  );
}
