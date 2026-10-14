
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

  const stilePulsante = {
    padding: "5px 10px",
    fontSize: 12,
    whiteSpace: "nowrap"
  };

  const stileCella = {
    padding: "6px 8px",
    fontSize: 12,
    verticalAlign: "top"
  };

  if (loading) {
    return <p>Caricamento scheda...</p>;
  }

  if (errore) {
    return (
      <div>
        <p style={{ color: "red" }}>{errore}</p>
        <button onClick={onChiudi}>INDIETRO</button>
      </div>
    );
  }

  if (!cantina) {
    return <p>Cantina non trovata.</p>;
  }

  return (
  <section style={{ marginTop: 12 }}>

    {attivita && (
      <div
        style={{
          marginBottom: 12,
          padding: 10,
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#f7f7f7"
        }}
      >
        <strong>ATTIVITÀ DA GESTIRE</strong>

        <div style={{ marginTop: 8 }}>
  {!riprogramma ? (
    <div style={{ display: "flex", gap: 8 }}>
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap"
      }}
    >
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

    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 10
      }}
    >

    </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 10
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10
          }}
        >
          <button
            type="button"
            onClick={onChiudi}
            style={stilePulsante}
          >
            ← INDIETRO
          </button>

        <h2 style={{ margin: 0 }}>
  {cantina.nome_portale || cantina.ragione_sociale}
</h2>

          <span
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              background: "#e2e8f0",
              fontSize: 11,
              fontWeight: 600
            }}
          >
            {cantina.stato}
          </span>
        </div>

        {vista !== "dettaglio" && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() =>
                setVista(vista === "modifica" ? "" : "modifica")
              }
              style={stilePulsante}
            >
              MODIFICA
            </button>

            <button
              type="button"
              onClick={() =>
                setVista(vista === "contatto" ? "" : "contatto")
              }
              style={stilePulsante}
            >
              + CONTATTO
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "6px 16px",
          padding: 10,
          border: "1px solid #ddd",
          borderRadius: 6,
          fontSize: 12,
          marginBottom: 10
        }}
      >
        <div>
          <strong>ID Portale:</strong> {cantina.id_portale || "—"}
        </div>

        <div>
          <strong>P. IVA:</strong> {cantina.partita_iva || "—"}
        </div>

        <div>
  <strong>Ragione sociale:</strong>{" "}
  {cantina.ragione_sociale || "—"}
</div>

<div>
  <strong>Città:</strong> {cantina.citta || "—"}
</div>

<div>
  <strong>Provincia:</strong> {cantina.provincia || "—"}
</div>

<div>
  <strong>Regione:</strong> {cantina.regione || "—"}
</div>

        <div>
          <strong>Referente:</strong> {cantina.referente || "—"}
        </div>

        <div>
          <strong>Cellulare:</strong> {cantina.cellulare || "—"}
        </div>

        <div>
          <strong>Telefono:</strong> {cantina.telefono || "—"}
        </div>

        <div>
          <strong>Email:</strong> {cantina.email || "—"}
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <strong>Indirizzo:</strong> {cantina.indirizzo || "—"}
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
            <section aria-label="Dettaglio storico contatto">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12
                }}
              >
                <h3 style={{ margin: 0 }}>Dettaglio storico contatto</h3>
                <button type="button" onClick={chiudiDettaglioContatto}>
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
                    <div>{dettaglioStorico?.presentazione || "Non registrato"}</div>
                  </div>
                  <div>
                    <strong>Stato adesione registrato</strong>
                    <div>{dettaglioStorico?.adesione || "Non registrato"}</div>
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
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16 }}>
          Storico contatti
        </h3>

        <span style={{ fontSize: 12, color: "#64748b" }}>
          {contatti.length} registrazioni
        </span>
      </div>

      {contatti.length === 0 ? (
        <p style={{ fontSize: 12 }}>
          Nessun contatto registrato.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse"
            }}
          >
            <thead>
              <tr>
                <th style={stileCella}>Data</th>
                <th style={stileCella}>Tipo</th>
                <th style={stileCella}>Canale</th>
                <th style={stileCella}>Interlocutore</th>
                <th style={stileCella}>Note</th>
                <th style={stileCella}>Dettaglio</th>
              </tr>
            </thead>

            <tbody>
              {contatti.map((contatto) => (
                <tr key={contatto.id}>
                  <td
                    style={{
                      ...stileCella,
                      whiteSpace: "nowrap"
                    }}
                  >
                    {formattaData(contatto.data_contatto)}
                  </td>

                  <td style={stileCella}>
                    {contatto.aggiornamento_prodotti
                      ? "PRODOTTI AGGIORNATI"
                      : "CONTATTO"}
                  </td>

                  <td style={stileCella}>
                    {contatto.canale || "—"}
                  </td>

                  <td style={stileCella}>
                    {contatto.interlocutore || "—"}
                  </td>

                  <td style={stileCella}>
                    {contatto.sintesi || "—"}
                  </td>

                  <td style={stileCella}>
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
