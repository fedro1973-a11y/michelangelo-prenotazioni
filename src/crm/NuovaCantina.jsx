
import { useEffect, useState } from "react";
import { crmSupabase } from "./supabase";

const FORM_VUOTO = {
  id_portale: "",
  nome_portale: "",
  ragione_sociale: "",
  partita_iva: "",
  indirizzo: "",
  citta: "",
  provincia: "",
  regione: "",
  referente: "",
  cellulare: "",
  telefono: "",
  email: "",
  note: "",
  referente_2: "",
  cellulare_2: "",
  telefono_2: "",
  email_2: "",
  stato: "NUOVO",
  segnalatore_id: ""
};

function preparaForm(cantina) {
  if (!cantina) return { ...FORM_VUOTO };

  return {
    ...FORM_VUOTO,
    ...Object.fromEntries(
      Object.keys(FORM_VUOTO).map((campo) => [
        campo,
        cantina[campo] == null
          ? ""
          : String(cantina[campo])
      ])
    )
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
        id_portale: form.id_portale.trim() || null,
        nome_portale: form.nome_portale.trim() || null,
        ragione_sociale: form.ragione_sociale.trim(),
        indirizzo: form.indirizzo.trim() || null,
        citta: form.citta.trim() || null,
        provincia: form.provincia.trim() || null,
        regione: form.regione.trim() || null,
        referente: form.referente.trim() || null,
        cellulare: form.cellulare.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        note: form.note.trim() || null,
referente_2: form.referente_2.trim() || null,
cellulare_2: form.cellulare_2.trim() || null,
telefono_2: form.telefono_2.trim() || null,
email_2: form.email_2.trim() || null,
        stato: form.stato,
        segnalatore_id: form.segnalatore_id
          ? Number(form.segnalatore_id)
          : null
      };

      if (!dati.ragione_sociale) {
        throw new Error("Inserisci la ragione sociale.");
      }

      if (!modifica && !dati.nome_portale) {
        throw new Error(
          "Inserisci il nome cantina sul portale."
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
        dati.partita_iva =
          form.partita_iva.trim() || null;

        risultato = await crmSupabase
          .from("crm_cantine")
          .insert(dati)
          .select("id")
          .single();
      }

      if (risultato.error) {
        console.error(risultato.error);
        throw new Error("Salvataggio non riuscito.");
      }

      onSalvata?.();
    } catch (err) {
      setErrore(err.message || "Errore imprevisto.");
    } finally {
      setSaving(false);
    }
  }

  const campi = [
  ["id_portale", "ID Portale"],
  ["nome_portale", "Nome cantina sul portale"],
  ["ragione_sociale", "Ragione sociale"],
  ["partita_iva", "Partita IVA"],
  ["indirizzo", "Indirizzo"],
  ["citta", "Città"],
  ["provincia", "Provincia"],
  ["regione", "Regione"],
  ["referente", "Referente"],
  ["cellulare", "Cellulare"],
  ["telefono", "Telefono"],
  ["email", "Email"],
  ["referente_2", "Referente 2"],
  ["cellulare_2", "Cellulare 2"],
  ["telefono_2", "Telefono 2"],
  ["email_2", "Email 2"],
  ["note", "Note cantina"]
];

  const stileCampo = {
    width: "100%",
    padding: "6px 8px",
    boxSizing: "border-box",
    minHeight: 32
  };

  return (
    <form
      onSubmit={salvaCantina}
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(190px, 1fr))",
        gap: "9px 12px"
      }}
    >
      {modifica && (
        <div
          style={{
            gridColumn: "1 / -1",
            fontSize: 12
          }}
        >
          ID anagrafica: {cantina.id}
        </div>
      )}

      {campi.map(([campo, etichetta]) => {
        const bloccato =
          modifica && campo === "partita_iva";

        return (
          <label key={campo} style={{ fontSize: 12 }}>
            <div style={{ marginBottom: 3 }}>
              {etichetta}
            </div>

            <input
              type={
  campo === "email" || campo === "email_2"
    ? "email"
    : "text"
}
              value={form[campo]}
              onChange={(e) =>
                aggiorna(campo, e.target.value)
              }
              required={
                campo === "ragione_sociale" ||
                (!modifica && campo === "nome_portale")
              }
              readOnly={bloccato}
              title={
                bloccato
                  ? "Per un nuovo soggetto giuridico, crea una nuova cantina."
                  : undefined
              }
            maxLength={campo === "id_portale" ? 5 : undefined}
              style={{
                ...stileCampo,
                background: bloccato
                  ? "#f1f5f9"
                  : "white"
              }}
            />
          </label>
        );
      })}

      <label style={{ fontSize: 12 }}>
        <div style={{ marginBottom: 3 }}>
          Stato
        </div>

        <select
          value={form.stato}
          onChange={(e) =>
            aggiorna("stato", e.target.value)
          }
          style={stileCampo}
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

      <label style={{ fontSize: 12 }}>
        <div style={{ marginBottom: 3 }}>
          Segnalatore
        </div>

        <select
          value={form.segnalatore_id}
          onChange={(e) =>
            aggiorna("segnalatore_id", e.target.value)
          }
          disabled={Boolean(erroreSegnalatori)}
          style={stileCampo}
        >
          <option value="">Nessun segnalatore</option>

          {segnalatori
            .filter(
              (s) =>
                s.attivo ||
                String(s.id) === form.segnalatore_id
            )
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
                {!s.attivo ? " (disattivato)" : ""}
              </option>
            ))}
        </select>

        {erroreSegnalatori && (
          <div style={{ color: "red" }}>
            {erroreSegnalatori}
          </div>
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
          Se cambia il soggetto giuridico o la
          partita IVA, crea una nuova anagrafica.
        </p>
      )}

      <div
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 12
        }}
      >
        {errore && (
          <span style={{ color: "red", fontSize: 12 }}>
            {errore}
          </span>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            position: "relative",
            minWidth: 155,
            minHeight: 34
          }}
        >
          <span
            style={{
              visibility: saving ? "hidden" : "visible"
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
              Salvataggio...
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
