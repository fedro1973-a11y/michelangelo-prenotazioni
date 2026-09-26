
import { useEffect, useState } from "react";
import { crmSupabase } from "./supabase";

export default function Segnalatori() {
  const [segnalatori, setSegnalatori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errore, setErrore] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [mostraModulo, setMostraModulo] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefono: "",
    note: ""
  });

  async function caricaSegnalatori() {
    setLoading(true);
    setErrore("");

    const { data, error } = await crmSupabase
      .from("crm_segnalatori")
      .select("id, nome, email, telefono, note, attivo")
      .order("nome");

    if (error) {
      setErrore("Impossibile caricare i segnalatori.");
    } else {
      setSegnalatori(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    caricaSegnalatori();
  }, []);

  function aggiorna(campo, valore) {
    setForm((precedente) => ({
      ...precedente,
      [campo]: valore
    }));
  }

  async function salvaSegnalatore(e) {
    e.preventDefault();

    if (saving) return;

    setSaving(true);
    setErrore("");
    setMessaggio("");

    try {
      const { error } = await crmSupabase
        .from("crm_segnalatori")
        .insert({
          nome: form.nome.trim(),
          email: form.email.trim() || null,
          telefono: form.telefono.trim() || null,
          note: form.note.trim() || null
        });

      if (error) throw error;

      setForm({
        nome: "",
        email: "",
        telefono: "",
        note: ""
      });

      setMostraModulo(false);
      await caricaSegnalatori();
      setMessaggio("Segnalatore salvato.");
    } catch (error) {
      console.error(error);
      setErrore("Errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  const campoStyle = {
    width: "100%",
    padding: 8
  };

  return (
    <section style={{ marginTop: 25 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h2>Segnalatori</h2>

        <button
          onClick={() => {
            setMostraModulo(!mostraModulo);
            setErrore("");
            setMessaggio("");
          }}
          disabled={saving}
        >
          {mostraModulo ? "ANNULLA" : "+ NUOVO SEGNALATORE"}
        </button>
      </div>

      {mostraModulo && (
        <form
          onSubmit={salvaSegnalatore}
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            padding: 20,
            marginBottom: 20,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 8
          }}
        >
          <label>
            Nome *
            <input
              style={campoStyle}
              value={form.nome}
              onChange={(e) =>
                aggiorna("nome", e.target.value)
              }
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              style={campoStyle}
              value={form.email}
              onChange={(e) =>
                aggiorna("email", e.target.value)
              }
            />
          </label>

          <label>
            Telefono
            <input
              style={campoStyle}
              value={form.telefono}
              onChange={(e) =>
                aggiorna("telefono", e.target.value)
              }
            />
          </label>

          <label>
            Note
            <input
              style={campoStyle}
              value={form.note}
              onChange={(e) =>
                aggiorna("note", e.target.value)
              }
            />
          </label>

          <div style={{
            gridColumn: "1 / -1",
            textAlign: "right"
          }}>
            <button type="submit" disabled={saving}>
              {saving ? "Salvataggio..." : "SALVA SEGNALATORE"}
            </button>
          </div>
        </form>
      )}

      {errore && (
        <p style={{ color: "red" }}>{errore}</p>
      )}

      {messaggio && (
        <p style={{ color: "green" }}>{messaggio}</p>
      )}

      {loading ? (
        <p>Caricamento...</p>
      ) : segnalatori.length === 0 ? (
        <p>Nessun segnalatore presente.</p>
      ) : (
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left"
        }}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Telefono</th>
              <th>Stato</th>
            </tr>
          </thead>

          <tbody>
            {segnalatori.map((s) => (
              <tr key={s.id}>
                <td>{s.nome}</td>
                <td>{s.email}</td>
                <td>{s.telefono}</td>
                <td>{s.attivo ? "ATTIVO" : "DISATTIVATO"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
