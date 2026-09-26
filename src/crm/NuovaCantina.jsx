
import { useEffect, useState } from "react";
import { crmSupabase } from "./supabase";

export default function NuovaCantina() {
  const [segnalatori, setSegnalatori] = useState([]);
  const [erroreSegnalatori, setErroreSegnalatori] = useState("");

  const [form, setForm] = useState({
    ragione_sociale: "",
    partita_iva: "",
    indirizzo: "",
    referente: "",
    cellulare: "",
    telefono: "",
    email: "",
    stato: "NUOVO",
    id_portale: "",
    segnalatore_id: ""
  });

  useEffect(() => {
    let active = true;

    async function caricaSegnalatori() {
      const { data, error } = await crmSupabase
        .from("crm_segnalatori")
        .select("id, nome")
        .eq("attivo", true)
        .order("nome");

      if (!active) return;

      if (error) {
        setErroreSegnalatori(
          "Impossibile caricare i segnalatori."
        );
      } else {
        setSegnalatori(data ?? []);
      }
    }

    caricaSegnalatori();

    return () => {
      active = false;
    };
  }, []);

  function aggiorna(campo, valore) {
    setForm((precedente) => ({
      ...precedente,
      [campo]: valore
    }));
  }

  const campi = [
    ["ragione_sociale", "Ragione sociale"],
    ["partita_iva", "Partita IVA"],
    ["indirizzo", "Indirizzo"],
    ["referente", "Referente"],
    ["cellulare", "Cellulare"],
    ["telefono", "Telefono"],
    ["email", "Email"],
    ["id_portale", "ID Portale"]
  ];

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12
      }}
    >
      {campi.map(([campo, etichetta]) => (
        <label key={campo}>
          <div style={{ marginBottom: 4 }}>
            {etichetta}
          </div>

          <input
            type={campo === "email" ? "email" : "text"}
            value={form[campo]}
            onChange={(e) =>
              aggiorna(campo, e.target.value)
            }
            required={campo === "ragione_sociale"}
            maxLength={campo === "id_portale" ? 5 : undefined}
            style={{
              width: "100%",
              padding: 8
            }}
          />
        </label>
      ))}

      <label>
        <div style={{ marginBottom: 4 }}>
          Stato
        </div>

        <select
          value={form.stato}
          onChange={(e) =>
            aggiorna("stato", e.target.value)
          }
          style={{
            width: "100%",
            padding: 8
          }}
        >
          <option value="NUOVO">NUOVO</option>
          <option value="IN TRATTATIVA">
            IN TRATTATIVA
          </option>
          <option value="NON INTERESSATO">
            NON INTERESSATO
          </option>
          <option value="ATTIVO">ATTIVO</option>
          <option value="CESSATO">CESSATO</option>
        </select>
      </label>

      <label>
        <div style={{ marginBottom: 4 }}>
          Segnalatore
        </div>

        <select
          value={form.segnalatore_id}
          onChange={(e) =>
            aggiorna("segnalatore_id", e.target.value)
          }
          style={{
            width: "100%",
            padding: 8
          }}
        >
          <option value="">Nessun segnalatore</option>

          {segnalatori.map((segnalatore) => (
            <option
              key={segnalatore.id}
              value={segnalatore.id}
            >
              {segnalatore.nome}
            </option>
          ))}
        </select>

        {erroreSegnalatori && (
          <p style={{ color: "red", fontSize: 12 }}>
            {erroreSegnalatori}
          </p>
        )}
      </label>

      <div
        style={{
          gridColumn: "1 / -1",
          textAlign: "right"
        }}
      >
        <button type="submit" disabled>
          SALVA CANTINA
        </button>
      </div>
    </form>
  );
}
