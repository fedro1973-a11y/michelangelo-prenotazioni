import { useEffect, useState } from "react";
import { crmSupabase } from "./supabase";

const FORM_VUOTO = {
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
};

function preparaForm(cantina) {
  if (!cantina) return { ...FORM_VUOTO };

  return {
    ragione_sociale: cantina.ragione_sociale ?? "",
    partita_iva: cantina.partita_iva ?? "",
    indirizzo: cantina.indirizzo ?? "",
    referente: cantina.referente ?? "",
    cellulare: cantina.cellulare ?? "",
    telefono: cantina.telefono ?? "",
    email: cantina.email ?? "",
    stato: cantina.stato ?? "NUOVO",
    id_portale: cantina.id_portale ?? "",
    segnalatore_id:
      cantina.segnalatore_id == null
        ? ""
        : String(cantina.segnalatore_id)
  };
}

export default function NuovaCantina({
  cantina = null,
  onSalvata
}) {
  const modifica = cantina !== null;

  const [form, setForm] = useState(() =>
    preparaForm(cantina)
  );
  const [segnalatori, setSegnalatori] = useState([]);
  const [erroreSegnalatori, setErroreSegnalatori] =
    useState("");
  const [saving, setSaving] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    setForm(preparaForm(cantina));
    setErrore("");
  }, [cantina]);

  useEffect(() => {
    let active = true;

    async function caricaSegnalatori() {
      const { data, error } = await crmSupabase
        .from("crm_segnalatori")
        .select("id, nome, attivo")
        .order("nome");

      if (!active) return;

      if (error) {
        setErroreSegnalatori(
          "Impossibile caricare i segnalatori."
        );
      } else {
        setSegnalatori(data ?? []);
        setErroreSegnalatori("");
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

  async function salvaCantina(e) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setErrore("");

    try {
      const dati = {
        ragione_sociale: form.ragione_sociale.trim(),
        indirizzo: form.indirizzo.trim() || null,
        referente: form.referente.trim() || null,
        cellulare: form.cellulare.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        stato: form.stato,
        id_portale: form.id_portale.trim() || null,
        segnalatore_id: form.segnalatore_id
          ? Number(form.segnalatore_id)
          : null
      };

      if (!modifica) {
        dati.partita_iva =
          form.partita_iva.trim() || null;
      }

      if (!dati.ragione_sociale) {
        throw new Error(
          "Inserisci la ragione sociale."
        );
      }

      if (
        dati.id_portale &&
        !/^[0-9]{1,5}$/.test(dati.id_portale)
      ) {
        throw new Error(
          "L'ID Portale deve contenere da 1 a 5 cifre."
        );
      }

      if (
        dati.stato === "ATTIVO" &&
        !dati.id_portale
      ) {
        throw new Error(
          "L'ID Portale è obbligatorio per le cantine attive."
        );
      }

      let risultato;

      if (modifica) {
        risultato = await crmSupabase
          .from("crm_cantine")
          .update({
            ...dati,
            aggiornata_il: new Date().toISOString()
          })
          .eq("id", cantina.id)
          .select("id")
          .single();
      } else {
        risultato = await crmSupabase
          .from("crm_cantine")
          .insert(dati)
          .select("id")
          .single();
      }

      if (risultato.error) {
        console.error(risultato.error);
        throw new Error(
          "Salvataggio non riuscito."
        );
      }

      if (onSalvata) onSalvata();
    } catch (err) {
      setErrore(
        err.message || "Errore imprevisto."
      );
    } finally {
      setSaving(false);
    }
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
      onSubmit={salvaCantina}
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12
      }}
    >
      {modifica && (
        <div
          style={{
            gridColumn: "1 / -1",
            fontSize: 13
          }}
        >
          ID anagrafica: {cantina.id}
        </div>
      )}

      {campi.map(([campo, etichetta]) => {
        const bloccato =
          modifica && campo === "partita_iva";

        return (
          <label key={campo}>
            <div style={{ marginBottom: 4 }}>
              {etichetta}
            </div>

            <input
              type={
                campo === "email"
                  ? "email"
                  : "text"
              }
              value={form[campo]}
              onChange={(e) =>
                aggiorna(campo, e.target.value)
              }
              required={
                campo === "ragione_sociale"
              }
              readOnly={bloccato}
              title={
                bloccato
                  ? "Per un nuovo soggetto giuridico, crea una nuova cantina."
                  : undefined
              }
              maxLength={
                campo === "id_portale"
                  ? 5
                  : undefined
              }
              style={{
                width: "100%",
                padding: 8,
                boxSizing: "border-box",
                background: bloccato
                  ? "#f1f5f9"
                  : "white"
              }}
            />
          </label>
        );
      })}

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
          <option value="NUOVO">
            NUOVO
          </option>
          <option value="IN TRATTATIVA">
            IN TRATTATIVA
          </option>
          <option value="NON INTERESSATO">
            NON INTERESSATO
          </option>
          <option value="ATTIVO">
            ATTIVO
          </option>
          <option value="CESSATO">
            CESSATO
          </option>
        </select>
      </label>

      <label>
        <div style={{ marginBottom: 4 }}>
          Segnalatore
        </div>

        <select
          value={form.segnalatore_id}
          onChange={(e) =>
            aggiorna(
              "segnalatore_id",
              e.target.value
            )
          }
          disabled={
            Boolean(erroreSegnalatori)
          }
          style={{
            width: "100%",
            padding: 8
          }}
        >
          <option value="">
            Nessun segnalatore
          </option>

          {segnalatori
            .filter(
              (segnalatore) =>
                segnalatore.attivo ||
                String(segnalatore.id) ===
                  form.segnalatore_id
            )
            .map((segnalatore) => (
              <option
                key={segnalatore.id}
                value={segnalatore.id}
              >
                {segnalatore.nome}
                {!segnalatore.attivo
                  ? " (disattivato)"
                  : ""}
              </option>
            ))}
        </select>

        {erroreSegnalatori && (
          <p
            style={{
              color: "red",
              fontSize: 12
            }}
          >
            {erroreSegnalatori}
          </p>
        )}
      </label>

      {modifica && (
        <p
          style={{
            gridColumn: "1 / -1",
            fontSize: 12,
            margin: 0
          }}
        >
          Se cambia il soggetto giuridico
          o la partita IVA, crea una
          nuova anagrafica.
        </p>
      )}

      <div
        style={{
          gridColumn: "1 / -1",
          textAlign: "right"
        }}
      >
        {errore && (
          <p style={{ color: "red" }}>
            {errore}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            position: "relative",
            minWidth: 165,
            minHeight: 36
          }}
        >
          <span
            style={{
              visibility: saving
                ? "hidden"
                : "visible"
            }}
          >
            {modifica
              ? "SALVA MODIFICHE"
              : "SALVA CANTINA"}
          </span>

          {saving && (
            <span
              role="status"
              aria-label="Salvataggio in corso"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              ◌ Salvataggio
            </span>
          )}
        </button>
      </div>
    </form>
  );
}