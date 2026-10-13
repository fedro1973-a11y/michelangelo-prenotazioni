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
      setErrore("Errore nel caricamento delle attivitÃ .");
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
        const boxStyle = {
    flex: 1,
    minWidth: 180,
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 18,
    background: "#fff"
  };
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
    return <p>Caricamento attivitÃ ...</p>;
  }

  return (
    <div>
      <h3
  onClick={() => setFiltro("DA_GESTIRE")}
  style={{ cursor: "pointer" }}
  title="Mostra tutte le attività da gestire"
>
  Dashboard
</h3>

      {errore && (
        <p style={{ color: "red" }}>
          {errore}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 25
        }}
      >
        <div
  style={{
    ...boxStyle,
    cursor: "pointer",
    background: filtro === "SILENTI" ? "#fff3e8" : "#fff"
  }}
  onClick={() => setFiltro(filtro === "SILENTI" ? "DA_GESTIRE" : "SILENTI")}
>
  <div style={{ fontSize: 13 }}>CANTINE SILENTI</div>
  <div style={{
    fontSize: 30,
    fontWeight: "bold",
    color: "#b45309"
  }}>
    {cantineSilenti.length}
  </div>
  <div style={{ fontSize: 11, marginTop: 5 }}>
    {filtro === "SILENTI" ? "Nascondi elenco" : "Mostra elenco"}
  </div>
</div>
        <div
  style={{
    ...boxStyle,
    cursor: "pointer",
    background: filtro === "SCADUTE" ? "#fff3e8" : "#fff"
  }}
  onClick={() => setFiltro("SCADUTE")}
>
          <div style={{ fontSize: 13 }}>SCADUTE</div>
          <div style={{ fontSize: 30, fontWeight: "bold" }}>
            {scadute.length}
          </div>
        </div>

        <div
  style={{
    ...boxStyle,
    cursor: "pointer",
    background: filtro === "OGGI" ? "#fff3e8" : "#fff"
  }}
  onClick={() => setFiltro("OGGI")}
>
          <div style={{ fontSize: 13 }}>DA FARE OGGI</div>
          <div style={{ fontSize: 30, fontWeight: "bold" }}>
            {oggiDaFare.length}
          </div>
        </div>

        <div
  style={{
    ...boxStyle,
    cursor: "pointer",
    background: filtro === "PROSSIME" ? "#fff3e8" : "#fff"
  }}
  onClick={() => setFiltro("PROSSIME")}
>
          <div style={{ fontSize: 13 }}>PROSSIME</div>
          <div style={{ fontSize: 30, fontWeight: "bold" }}>
            {prossime.length}
          </div>
        </div>
      </div>

{filtro === "SILENTI" && (
  <div style={{ marginBottom: 25 }}>
    <h3>Elenco cantine silenti ({cantineSilenti.length})</h3>

    {cantineSilenti.length === 0 ? (
      <p>Nessuna cantina silente.</p>
    ) : (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8 }}>CANTINA</th>
            <th style={{ textAlign: "left", padding: 8 }}>
              ULTIMO CONTATTO
            </th>
            <th style={{ textAlign: "center", padding: 8 }}>
              SCHEDA
            </th>
          </tr>
        </thead>
        <tbody>
          {cantineSilenti.map((cantina) => (
            <tr
              key={cantina.id}
              style={{ borderTop: "1px solid #ddd" }}
            >
              <td style={{ padding: 8, fontWeight: "bold" }}>
                {cantina.nome_portale}
              </td>
              <td style={{ padding: 8 }}>
                {cantina.ultimo_contatto
                  ? dataLocale(cantina.ultimo_contatto)
                  : "Mai contattata"}
              </td>
              <td style={{ padding: 8, textAlign: "center" }}>
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
    )}
  </div>
)}

{filtro !== "SILENTI" && (
  <>
    <h3>Attività da gestire</h3>

      {attivitaVisualizzate.length === 0 ? (
        <p>
  {filtro === "SCADUTE"
    ? "Nessuna attività scaduta."
    : filtro === "OGGI"
      ? "Nessuna attività da fare oggi."
      : filtro === "PROSSIME"
        ? "Nessuna attività prossima."
        : "Nessuna attività scaduta o prevista per oggi."}
</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse"
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>
                DATA
              </th>
              <th style={{ textAlign: "center", padding: 8 }}>
                SCHEDA
              </th>
              <th style={{ textAlign: "left", padding: 8 }}>
                CANTINA
              </th>
              <th style={{ textAlign: "left", padding: 8 }}>
                ATTIVITÃ€
              </th>
            </tr>
          </thead>

          <tbody>
            {attivitaVisualizzate.map(a => (
              <tr
                key={a.id}
                style={{
                  borderTop: "1px solid #ddd"
                }}
              >
                <td style={{ padding: 8 }}>
                  {dataLocale(a.scadenza)}
                </td>

                <td style={{ padding: 8, textAlign: "center" }}>
  <button
  onClick={() => setAttivitaAperta(a)}
>
  SCHEDA
</button>
</td>

                <td style={{ padding: 8, fontWeight: "bold" }}>
                  {a.crm_cantine?.nome_portale || "â€”"}
                </td>

                <td style={{ padding: 8 }}>
                  {a.descrizione}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
            )}
  </>
)}
    </div>
  );
}
