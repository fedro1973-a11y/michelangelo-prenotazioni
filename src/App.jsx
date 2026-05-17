import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const USERS = {
  FEDRIGO: "fedro",
  FESTARI: "lele",
  GUSMERI: "gusme",
  GUINDANI: "gil",
  MONTINI: "genio",
  MORESCHI: "moro",
  RAFFAGLIO: "raffa",
  RIZZO: "bomber",
  TOGNOLI: "frency",
};

const SLOT_LABELS = [
  "Martedì 18:30/19:30",
  "Martedì 19:30/20:30",
  "Giovedì 19:00/20:00",
  "Giovedì 20:00/21:00",
  "Venerdì 1^ parte",
  "Venerdì 2^ parte",
  "Terzo tempo",
  "Sabato 9:00/10:00",
  "Sabato 10:00/11:00",
  "Sabato 11:00/12:00",
];

function getTargetWeek() {
  const now = new Date();

  // Calcolo sabato attuale ore 12:00
  const thisSaturday = new Date(now);
  thisSaturday.setDate(now.getDate() - ((now.getDay() + 1) % 7));
  thisSaturday.setHours(12, 0, 0, 0);

  // Se siamo dopo sabato ore 12:01, passo alla settimana successiva
  let start, end;
  if (now >= thisSaturday) {
    start = new Date(thisSaturday);
    end = new Date(thisSaturday);
    end.setDate(thisSaturday.getDate() + 7);
  } else {
    // prima di sabato 12:00 => settimana corrente
    start = new Date(thisSaturday);
    start.setDate(thisSaturday.getDate() - 7);
    end = new Date(thisSaturday);
  }

  const fmt = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

  return {
    weekKey: start.toISOString().slice(0, 10),
    label: `da sabato ${fmt(start)} a sabato ${fmt(end)}`,
    monthKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
  };
}

const styles = {
  page: { maxWidth: 480, margin: "0 auto", padding: 16, fontFamily: "Arial, sans-serif" },
  card: { background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  input: { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc", boxSizing: "border-box" },
  button: { padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer" },
};

export default function App() {
  if (!supabase) {
    return (
      <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
        <h2>Configurazione Supabase mancante</h2>
        <p>Controlla il file .env.local</p>
      </div>
    );
  }

  const week = useMemo(() => getTargetWeek(), []);

  const [player, setPlayer] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState({});

  async function loadBookings() {
    try {
      const { data } = await supabase
        .from("bookings")
        .select("slot, player")
        .eq("week_key", week.weekKey)
        .eq("archived", false);

      const grouped = {};
      (data || []).forEach((r) => {
        grouped[r.slot] = grouped[r.slot] || [];
        grouped[r.slot].push(r.player);
      });

      setBookings(grouped);
    } catch (err) {
      console.error("Errore caricamento prenotazioni:", err);
    }
  }

  useEffect(() => {
    if (user) loadBookings();
  }, [user]);

  const login = () => {
    if (USERS[player] === password) setUser(player);
    else alert("Credenziali non valide");
  };

  if (!user) {
    const sortedUsers = Object.keys(USERS).sort();
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2>Prenotazioni al MICHELANGELO</h2>
          <select style={styles.input} value={player} onChange={(e) => setPlayer(e.target.value)}>
            <option value="">Chi vuole prenotare?</option>
            {sortedUsers.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <div style={{ height: 10 }} />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div style={{ height: 10 }} />
          <button style={{ ...styles.button, width: "100%" }} onClick={login}>LOGIN</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Qui va tutto il resto del codice per mostrare slot e prenotazioni */}
      <h2>Ciao {user}</h2>
      <p>Settimana {week.label}</p>
    </div>
  );
}