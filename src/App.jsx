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
  const day = now.getDay(); // 0 domenica - 6 sabato

  const lastSaturday = new Date(now);
  lastSaturday.setDate(now.getDate() - ((day + 1) % 7));
  lastSaturday.setHours(12, 0, 0, 0);

  const nextSaturday = new Date(lastSaturday);
  nextSaturday.setDate(lastSaturday.getDate() + 7);

  let start, end;
  if (now >= lastSaturday) {
    start = new Date(lastSaturday);
    end = new Date(nextSaturday);
  } else {
    start = new Date(lastSaturday);
    start.setDate(lastSaturday.getDate() - 7);
    end = new Date(lastSaturday);
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
  }

  useEffect(() => {
    if (!user) return;
    loadBookings();
  }, [user]);

  const login = () => {
    if (USERS[player] === password) setUser(player);
    else alert("Credenziali non valide");
  };

  async function book(slot) {
    const players = bookings[slot] || [];
    const max = slot === "Terzo tempo" ? 999 : 4;

    if (players.includes(user)) return;

    if (players.length >= max) {
      alert("Mi spiace, lo slot risulta completo, ma tanto sai come sono le regole...");
      return;
    }

    await supabase.from("bookings").insert({
      week_key: week.weekKey,
      month_key: week.monthKey,
      slot,
      player: user,
      archived: false,
    });

    loadBookings();
  }

  async function remove(slot) {
    await supabase
      .from("bookings")
      .delete()
      .eq("week_key", week.weekKey)
      .eq("slot", slot)
      .eq("player", user)
      .eq("archived", false);

    loadBookings();
  }

  const signalColor = (slot, count) => {
    if (count === 0) return "green";
    if (slot !== "Terzo tempo" && count >= 4) return "red";
    return "orange";
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
      {/* ...resto del codice rimane invariato... */}
    </div>
  );
}