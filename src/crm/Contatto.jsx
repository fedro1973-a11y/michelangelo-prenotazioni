
import { useEffect, useState } from "react";
import { crmSupabase } from "./supabase";
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
  const [programmaRichiamo, setProgrammaRichiamo] = useState(false);
  const [dataRichiamo, setDataRichiamo] = useState("");
  const [descrizioneRichiamo, setDescrizioneRichiamo] = useState("");
  const [saving, setSaving] = useState(false);
  const [errore, setErrore] = useState("");
  const [dataContatto, setDataContatto] = useState(dataOggi);

  useEffect(() => {
    let active = true;

    async function caricaProgetti() {
      const { data, error } = await crmSupabase
        .from("crm_progetti")
        .select("id, nome")
        .eq("attivo", true)
        .order("nome");

      if (!active) return;

      if (error) {
        setErrore("Impossibile caricare i progetti.");
      } else {
        setProgetti(data ?? []);
      }
    }

    caricaProgetti();
    return () => { active = false; };
  }, []);

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
    const { error } = await crmSupabase.rpc(
      "crm_salva_contatto_richiamo",
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
    <form onSubmit={salva} style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 12
    }}>
      <h3 style={{ gridColumn: "1 / -1", margin: 0 }}>
        Nuovo contatto: {cantina.ragione_sociale}
      </h3>

      
      <label style={{ gridColumn: "1 / -1" }}>
        Data del contatto
        <input
          type="date"
          value={dataContatto}
          onChange={(e) => setDataContatto(e.target.value)}
          required
          style={{
            display: "block",
            width: "100%",
            padding: 8,
            boxSizing: "border-box",
            marginTop: 5
          }}
        />
      </label>

      <label style={{ gridColumn: "1 / -1" }}>
        <input
          type="checkbox"
          checked={prodotti}
          onChange={(e) => setProdotti(e.target.checked)}
        />
        {" "}Prodotti aggiornati
      </label>
{!prodotti && (
        <>
          <label>
            Canale
            <select
              value={canale}
              onChange={(e) => setCanale(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8 }}
            >
              <option value="TELEFONO">Telefono</option>
              <option value="EMAIL">Email</option>
              <option value="DI PERSONA">Di persona</option>
              <option value="WEB">Web</option>
              <option value="ALTRO">Altro</option>
            </select>
          </label>

          <label>
            Interlocutore
            <input
              value={interlocutore}
              onChange={(e) => setInterlocutore(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8 }}
            />
          </label>

          <label>
            Progetto
            <select
              value={progettoId}
              onChange={(e) => setProgettoId(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8 }}
            >
              <option value="">Nessun progetto</option>
              {progetti.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </label>
        </>
      )}

      <label style={{ gridColumn: "1 / -1" }}>
        {prodotti ? "Note (facoltative)" : "Sintesi della conversazione"}
        <textarea
          value={sintesi}
          onChange={(e) => setSintesi(e.target.value)}
          rows={3}
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box"
          }}
        />
      </label>

<div style={{ gridColumn: "1 / -1" }}>
  <label>
    <input
      type="checkbox"
      checked={programmaRichiamo}
      onChange={(e) => setProgrammaRichiamo(e.target.checked)}
    />
    {" "}PROGRAMMA PROSSIMO RICHIAMO
  </label>
</div>

{programmaRichiamo && (
  <>
    <label style={{ gridColumn: "1 / -1" }}>
      Data prossimo richiamo
      <input
        type="date"
        value={dataRichiamo}
        onChange={(e) => setDataRichiamo(e.target.value)}
        required
        style={{
          display: "block",
          width: "100%",
          padding: 8,
          boxSizing: "border-box",
          marginTop: 5
        }}
      />
    </label>
    <label style={{ gridColumn: "1 / -1" }}>
      Attività da svolgere
      <textarea
        value={descrizioneRichiamo}
        onChange={(e) => setDescrizioneRichiamo(e.target.value)}
        required
        rows={2}
        placeholder="Es. Richiamare per verificare interesse"
        style={{
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          marginTop: 5
        }}
      />
    </label>
  </>
)}
      {errore && (
        <p style={{ gridColumn: "1 / -1", color: "red" }}>
          {errore}
        </p>
      )}

      <div style={{
        gridColumn: "1 / -1",
        display: "flex",
        justifyContent: "flex-end",
        gap: 10
      }}>
        <button type="button" onClick={onAnnulla} disabled={saving}>
          ANNULLA
        </button>
        <button type="submit" disabled={saving} style={{ minWidth: 155 }}>
          {saving ? "Salvataggio..." : "SALVA CONTATTO"}
        </button>
      </div>
    </form>
  );
}
