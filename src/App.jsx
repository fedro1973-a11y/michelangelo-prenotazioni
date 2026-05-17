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

  // calcola martedì della settimana
  const day = now.getDay(); // 0=domenica, 1=lunedì ... 6=sabato
  const daysSinceTuesday = (day >= 2 ? day - 2 : day + 5);
  const tuesday = new Date(now);
  tuesday.setDate(now.getDate() - daysSinceTuesday);
  tuesday.setHours(0, 0, 0, 0);

  // calcola sabato ore 12 per switch
  const thisSaturday = new Date(now);
  thisSaturday.setDate(now.getDate() - ((day + 1) % 7));
  thisSaturday.setHours(12, 0, 0, 0);

  let start, end;
  if (now >= thisSaturday) {
    start = tuesday;
    end = new Date(tuesday);
    end.setDate(tuesday.getDate() + 5); // sabato
  } else {
    start = new Date(tuesday);
    start.setDate(tuesday.getDate() - 7);
    end = new Date(start);
    end.setDate(start.getDate() + 5);
  }

  const fmt = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;

  return {
    weekKey: start.toISOString().slice(0, 10),
    label: `Settimana dal ${fmt(start)}`,
    monthKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    startDate: start,
    endDate: end
  };
}

const styles = {
  page: { maxWidth: 480, margin: "0 auto", padding: 16, fontFamily: "Arial, sans-serif" },
  card: { background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  input: { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc", boxSizing: "border-box" },
  button: { padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer" },
  select: { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc", marginTop: 10, boxSizing: "border-box" },
};

export default function App() {
  if (!supabase) return <div style={{ padding: 20 }}>Configurazione Supabase mancante</div>;

  const week = useMemo(() => getTargetWeek(), []);
  const [player, setPlayer] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState({});
  const [archiveBookings, setArchiveBookings] = useState({});
  const [selectedArchiveWeek, setSelectedArchiveWeek] = useState("");

  async function loadBookings() {
    try {
      const { data } = await supabase
        .from("bookings")
        .select("slot, player, week_key")
        .eq("archived", false);

      const groupedCurrent = {};
      const groupedArchive = {};
      (data || []).forEach((r) => {
        if (r.week_key === week.weekKey) {
          groupedCurrent[r.slot] = groupedCurrent[r.slot] || [];
          groupedCurrent[r.slot].push(r.player);
        } else {
          groupedArchive[r.week_key] = groupedArchive[r.week_key] || {};
          groupedArchive[r.week_key][r.slot] = groupedArchive[r.week_key][r.slot] || [];
          groupedArchive[r.week_key][r.slot].push(r.player);
        }
      });
      setBookings(groupedCurrent);
      setArchiveBookings(groupedArchive);
    } catch (err) {
      console.error("Errore caricamento prenotazioni:", err);
    }
  }

  useEffect(() => { if (user) loadBookings(); }, [user]);
  const login = () => { if (USERS[player] === password) setUser(player); else alert("Credenziali non valide"); };

  if (!user) {
    const sortedUsers = Object.keys(USERS).sort();
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2>Prenotazioni al MICHELANGELO</h2>
          <select style={styles.input} value={player} onChange={(e) => setPlayer(e.target.value)}>
            <option value="">Chi vuole prenotare?</option>
            {sortedUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <div style={{ height: 10 }} />
          <input style={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div style={{ height: 10 }} />
          <button style={{ ...styles.button, width: "100%" }} onClick={login}>LOGIN</button>
        </div>
      </div>
    );
  }

  const archiveWeeks = Object.keys(archiveBookings).sort().reverse();

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2>Prenotazioni al MICHELANGELO</h2>
        <div>Ciao {user}</div>
        <small>{week.label}</small>
      </div>

      {/* SLOT attuali */}
      {SLOT_LABELS.map(slot => {
        const players = [...(bookings[slot] || [])].sort();
        const mine = players.includes(user);
        const isFull = slot !== "Terzo tempo" && players.length >= 4;
        const signalColor = players.length === 0 ? "green" : isFull ? "red" : "orange";
        return (
          <div key={slot} style={{ ...styles.card, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 999, background: signalColor, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 400 }}>{slot}</span>
                  {slot === "Terzo tempo" && <span style={{ fontSize: 14 }}>🍺 🍕 🎉</span>}
                  <span style={{ fontSize: 13, color: "#666", marginLeft: "auto" }}>{slot === "Terzo tempo" ? (players.length > 0 ? `${players.length} giocatori` : "") : `${players.length}/4`}</span>
                </div>
                {players.length > 0 && <div style={{ marginTop: 8, marginLeft: 20, fontSize: 13, color: "#444", lineHeight: 1.5 }}>{players.join(", ")}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {!mine && <button style={{ ...styles.button, background: isFull ? "#dc2626" : "#18a34a", color: "white", fontWeight: "bold" }} onClick={async () => { if(isFull){alert("Mi spiace, lo slot risulta completo, ma tanto sai come sono le regole..."); return;} await supabase.from("bookings").insert({week_key: week.weekKey, month_key: week.monthKey, slot, player: user, archived: false}); loadBookings(); }}>PRENOTA</button>}
                {mine && <button style={{ ...styles.button, background: "#dc2626", color: "white", fontWeight: "bold" }} onClick={async () => { await supabase.from("bookings").delete().eq("week_key", week.weekKey).eq("slot", slot).eq("player", user).eq("archived", false); loadBookings(); }}>SPRENOTA</button>}
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ padding: 20, textAlign: "center" }}>
        <button style={{ ...styles.button, width: "100%", background: "#111", color: "white", fontWeight: "bold" }} onClick={() => { setUser(null); setPassword(""); }}>LOGOUT</button>

        {archiveWeeks.length > 0 && (
          <select style={styles.select} value={selectedArchiveWeek} onChange={e => setSelectedArchiveWeek(e.target.value)}>
            <option value="">Archivio</option>
            {archiveWeeks.map(wk => <option key={wk} value={wk}>{`Settimana dal ${wk}`}</option>)}
          </select>
        )}

        {selectedArchiveWeek && SLOT_LABELS.map(slot => {
          const players = [...((archiveBookings[selectedArchiveWeek] || {})[slot] || [])].sort();
          if (players.length === 0) return null;
          return (
            <div key={slot} style={{ ...styles.card, padding: 10, background: "#fafafa" }}>
              <span style={{ fontSize: 14 }}>{slot}: {players.join(", ")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
