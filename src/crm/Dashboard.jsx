import { useEffect, useState } from "react";
import { crmSupabase } from "./supabase";
import SchedaCantina from "./SchedaCantina";

export default function Dashboard() {
  const [attivita, setAttivita] = useState([]);
  const [attivitaAperta, setAttivitaAperta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    caricaAttivita();
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

  const boxStyle = {
    flex: 1,
    minWidth: 180,
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 18,
    background: "#fff"
  };

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
    return <p>Caricamento attività...</p>;
  }

  return (
    <div>
      <h3>Dashboard</h3>

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
        <div style={boxStyle}>
          <div style={{ fontSize: 13 }}>SCADUTE</div>
          <div style={{ fontSize: 30, fontWeight: "bold" }}>
            {scadute.length}
          </div>
        </div>

        <div style={boxStyle}>
          <div style={{ fontSize: 13 }}>DA FARE OGGI</div>
          <div style={{ fontSize: 30, fontWeight: "bold" }}>
            {oggiDaFare.length}
          </div>
        </div>

        <div style={boxStyle}>
          <div style={{ fontSize: 13 }}>PROSSIME</div>
          <div style={{ fontSize: 30, fontWeight: "bold" }}>
            {prossime.length}
          </div>
        </div>
      </div>

      <h3>Attività da gestire</h3>

      {daGestire.length === 0 ? (
        <p>Nessuna attività scaduta o prevista per oggi.</p>
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
                ATTIVITÀ
              </th>
            </tr>
          </thead>

          <tbody>
            {daGestire.map(a => (
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
                  {a.crm_cantine?.nome_portale || "—"}
                </td>

                <td style={{ padding: 8 }}>
                  {a.descrizione}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}