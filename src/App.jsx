import { useState, useEffect, useCallback } from "react";

// ─── Storage (localStorage) ────────────────────────────────────────────────
const STORAGE_KEY = "sports-tracker-v1";
const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { running: [], tennis: [], gym: [] };
  } catch { return { running: [], tennis: [], gym: [] }; }
};
const save = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtPace = (km, min) => {
  if (!km || !min) return "--";
  const p = min / km;
  const m = Math.floor(p), s = Math.round((p - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};
const paceToMin = (pMin, pSec, km) => km * ((parseFloat(pMin) || 0) + (parseFloat(pSec) || 0) / 60);

const SPORTS = [
  { id: "running", label: "Running", emoji: "🏃" },
  { id: "tennis",  label: "Tenis",   emoji: "🎾" },
  { id: "gym",     label: "Gym",     emoji: "🏋️" },
];
const SC = { running: "#FF5733", tennis: "#F5C842", gym: "#4ECDC4" };

// ─── Shared primitives ─────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    {children}
  </div>
);

const Input = ({ style, ...props }) => (
  <input {...props} style={{
    background: "#1e293b", border: "1.5px solid #334155", borderRadius: 12,
    color: "#f1f5f9", fontFamily: "inherit", fontSize: 15, padding: "12px 14px",
    width: "100%", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
    ...style,
  }}
    onFocus={e => { e.target.style.borderColor = "#64748b"; e.target.style.boxShadow = "0 0 0 3px rgba(100,116,139,0.15)"; }}
    onBlur={e => { e.target.style.borderColor = "#334155"; e.target.style.boxShadow = "none"; }}
  />
);

const Textarea = (props) => (
  <textarea {...props} style={{
    background: "#1e293b", border: "1.5px solid #334155", borderRadius: 12,
    color: "#f1f5f9", fontFamily: "inherit", fontSize: 14, padding: "12px 14px",
    width: "100%", outline: "none", resize: "vertical", minHeight: 80,
    transition: "border-color 0.2s",
  }}
    onFocus={e => e.target.style.borderColor = "#64748b"}
    onBlur={e => e.target.style.borderColor = "#334155"}
  />
);

const Pill = ({ active, color, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: "8px 18px", borderRadius: 100, border: "1.5px solid",
    borderColor: active ? color : "#334155",
    background: active ? color + "22" : "transparent",
    color: active ? color : "#64748b",
    fontFamily: "inherit", fontSize: 13, fontWeight: 600,
    cursor: "pointer", transition: "all 0.18s", letterSpacing: "0.02em",
    whiteSpace: "nowrap",
  }}>{children}</button>
);

const Toggle = ({ value, onChange, color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onChange(!value)}>
    <div style={{
      width: 44, height: 24, borderRadius: 100, position: "relative",
      background: value ? color : "#334155", transition: "background 0.2s",
      flexShrink: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3, left: value ? 23 : 3,
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </div>
    <span style={{ fontSize: 14, color: value ? "#f1f5f9" : "#64748b", fontWeight: 500 }}>{label}</span>
  </div>
);

const ScorePicker = ({ value, onChange, color }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
      <button key={n} onClick={() => onChange(n)} style={{
        width: 36, height: 36, borderRadius: 10, border: "1.5px solid",
        borderColor: n <= value ? color : "#334155",
        background: n <= value ? color + "33" : "#1e293b",
        color: n <= value ? color : "#475569",
        fontFamily: "inherit", fontSize: 13, fontWeight: 700,
        cursor: "pointer", transition: "all 0.15s",
      }}>{n}</button>
    ))}
  </div>
);

const Preview = ({ color, children }) => (
  <div style={{
    background: color + "11", border: `1px solid ${color}33`,
    borderRadius: 10, padding: "10px 14px",
    fontSize: 13, color, fontWeight: 500,
  }}>{children}</div>
);

const SaveBtn = ({ onClick, children }) => (
  <button onClick={onClick} style={{
    flex: 1, padding: "14px", borderRadius: 14, border: "none",
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 700,
    cursor: "pointer", transition: "opacity 0.15s, transform 0.1s",
    boxShadow: "0 4px 15px rgba(99,102,241,0.35)",
  }}
    onMouseEnter={e => e.target.style.opacity = "0.9"}
    onMouseLeave={e => e.target.style.opacity = "1"}
    onMouseDown={e => e.target.style.transform = "scale(0.98)"}
    onMouseUp={e => e.target.style.transform = "scale(1)"}
  >{children}</button>
);

const CancelBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    padding: "14px 20px", borderRadius: 14, border: "1.5px solid #334155",
    background: "transparent", color: "#64748b", fontFamily: "inherit",
    fontSize: 15, cursor: "pointer", transition: "all 0.15s",
  }}
    onMouseEnter={e => { e.target.style.borderColor = "#64748b"; e.target.style.color = "#94a3b8"; }}
    onMouseLeave={e => { e.target.style.borderColor = "#334155"; e.target.style.color = "#64748b"; }}
  >Cancelar</button>
);

// ─── RUNNING FORM ──────────────────────────────────────────────────────────
function RunningForm({ onSave, onCancel, initial }) {
  const [subtype, setSubtype]     = useState(initial?.subtype || "corrida");
  const [date, setDate]           = useState(initial?.date || today());
  const [inputMode, setInputMode] = useState("duration");
  const [notes, setNotes]         = useState(initial?.notes || "");
  const [km, setKm]               = useState(initial?.km || "");
  const [minutes, setMinutes]     = useState(initial?.minutes || "");
  const [paceMin, setPaceMin]     = useState("");
  const [paceSec, setPaceSec]     = useState("");
  const [repDist, setRepDist]     = useState(initial?.repDist || "");
  const [reps, setReps]           = useState(initial?.reps || "");
  const [repTime, setRepTime]     = useState(initial?.repTime || "");
  const [rest, setRest]           = useState(initial?.rest || "");

  const derivedMin = inputMode === "pace" ? paceToMin(paceMin, paceSec, km) : parseFloat(minutes);

  const handleSave = () => {
    if (subtype === "corrida") {
      if (!km || !derivedMin || !date) return;
      onSave({ id: initial?.id || Date.now().toString(), type: "running", subtype, date, km: parseFloat(km), minutes: derivedMin, notes });
    } else {
      if (!repDist || !reps || !repTime || !date) return;
      onSave({ id: initial?.id || Date.now().toString(), type: "running", subtype, date, repDist: parseFloat(repDist), reps: parseInt(reps), repTime: parseFloat(repTime), rest: parseFloat(rest) || 0, notes });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Field label="Fecha"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="Tipo de sesión">
        <div style={{ display: "flex", gap: 8 }}>
          <Pill active={subtype === "corrida"} color={SC.running} onClick={() => setSubtype("corrida")}>Corrida</Pill>
          <Pill active={subtype === "pasadas"} color={SC.running} onClick={() => setSubtype("pasadas")}>Pasadas</Pill>
        </div>
      </Field>

      {subtype === "corrida" ? (
        <>
          <Field label="Distancia (km)">
            <Input type="number" placeholder="11.0" step="0.1" min="0" value={km} onChange={e => setKm(e.target.value)} />
          </Field>
          <Field label="Ingresar como">
            <div style={{ display: "flex", gap: 8 }}>
              <Pill active={inputMode === "duration"} color={SC.running} onClick={() => setInputMode("duration")}>Duración</Pill>
              <Pill active={inputMode === "pace"} color={SC.running} onClick={() => setInputMode("pace")}>Ritmo</Pill>
            </div>
          </Field>
          {inputMode === "duration"
            ? <Field label="Duración (min)"><Input type="number" placeholder="58" min="0" value={minutes} onChange={e => setMinutes(e.target.value)} /></Field>
            : <Field label="Ritmo (min : seg / km)">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Input type="number" placeholder="5 min" min="0" max="20" value={paceMin} onChange={e => setPaceMin(e.target.value)} />
                  <Input type="number" placeholder="16 seg" min="0" max="59" value={paceSec} onChange={e => setPaceSec(e.target.value)} />
                </div>
              </Field>
          }
          {km && derivedMin ? <Preview color={SC.running}>
            {inputMode === "pace" ? `Duración total: ${derivedMin.toFixed(1)} min` : `Ritmo: ${fmtPace(parseFloat(km), parseFloat(minutes))} min/km`}
          </Preview> : null}
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Dist / rep (m)"><Input type="number" placeholder="400" value={repDist} onChange={e => setRepDist(e.target.value)} /></Field>
            <Field label="Repeticiones"><Input type="number" placeholder="8" value={reps} onChange={e => setReps(e.target.value)} /></Field>
            <Field label="Tiempo / rep (s)"><Input type="number" placeholder="90" value={repTime} onChange={e => setRepTime(e.target.value)} /></Field>
            <Field label="Descanso (s)"><Input type="number" placeholder="60" value={rest} onChange={e => setRest(e.target.value)} /></Field>
          </div>
          {repDist && reps && repTime && <Preview color={SC.running}>
            {((parseFloat(repDist) * parseInt(reps)) / 1000).toFixed(2)} km totales · {((parseFloat(repTime) * parseInt(reps)) / 60).toFixed(1)} min activos
          </Preview>}
        </>
      )}
      <Field label="Notas"><Textarea placeholder="Cómo te sentiste, dónde corriste..." value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <SaveBtn onClick={handleSave}>Guardar sesión</SaveBtn>
        <CancelBtn onClick={onCancel} />
      </div>
    </div>
  );
}

// ─── TENNIS FORM ───────────────────────────────────────────────────────────
function TennisForm({ onSave, onCancel, initial }) {
  const [date, setDate]             = useState(initial?.date || today());
  const [isClass, setIsClass]       = useState(initial?.isClass ?? false);
  const [opponent, setOpponent]     = useState(initial?.opponent || "");
  const [duration, setDuration]     = useState(initial?.duration || "");
  const [playedSets, setPlayedSets] = useState(initial?.playedSets ?? false);
  const [sets, setSets]             = useState(initial?.sets || [{ me: "", them: "" }]);
  const [gameScore, setGameScore]   = useState(initial?.gameScore || 0);
  const [mobilityScore, setMobilityScore] = useState(initial?.mobilityScore || 0);
  const [notes, setNotes]           = useState(initial?.notes || "");

  const addSet    = () => setSets(s => [...s, { me: "", them: "" }]);
  const updateSet = (i, f, v) => setSets(s => s.map((x, j) => j === i ? { ...x, [f]: v } : x));
  const removeSet = (i) => setSets(s => s.filter((_, j) => j !== i));

  const handleSave = () => {
    if (!duration || !date || !gameScore || !mobilityScore) return;
    if (!isClass && !opponent) return;
    onSave({ id: initial?.id || Date.now().toString(), type: "tennis", date, isClass, opponent: isClass ? "" : opponent, duration: parseFloat(duration), playedSets, sets: playedSets ? sets : [], gameScore, mobilityScore, notes });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Field label="Fecha"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Toggle value={isClass} onChange={setIsClass} color={SC.tennis} label="Esta sesión fue una clase" />
      {!isClass && (
        <Field label="Oponente"><Input type="text" placeholder="Nombre" value={opponent} onChange={e => setOpponent(e.target.value)} /></Field>
      )}
      <Field label="Duración (min)"><Input type="number" placeholder="90" value={duration} onChange={e => setDuration(e.target.value)} /></Field>
      <Toggle value={playedSets} onChange={setPlayedSets} color={SC.tennis} label="Jugué sets" />
      {playedSets && (
        <Field label="Resultado por set">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 28px", gap: 8, alignItems: "center", paddingBottom: 4 }}>
              <span />
              <span style={{ fontSize: 11, color: "#64748b", textAlign: "center", fontWeight: 600 }}>YO</span>
              <span style={{ fontSize: 11, color: "#64748b", textAlign: "center", fontWeight: 600 }}>RIVAL</span>
              <span />
            </div>
            {sets.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 28px", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#475569", textAlign: "center", fontWeight: 600 }}>{i + 1}</span>
                <Input type="number" placeholder="6" min="0" max="7" value={s.me} onChange={e => updateSet(i, "me", e.target.value)} style={{ textAlign: "center" }} />
                <Input type="number" placeholder="4" min="0" max="7" value={s.them} onChange={e => updateSet(i, "them", e.target.value)} style={{ textAlign: "center" }} />
                <button onClick={() => removeSet(i)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 20, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
            <button onClick={addSet} style={{ alignSelf: "flex-start", background: "#1e293b", border: "1.5px solid #334155", borderRadius: 8, color: "#64748b", fontFamily: "inherit", fontSize: 13, padding: "7px 14px", cursor: "pointer" }}>+ Set</button>
          </div>
        </Field>
      )}
      <Field label="Mi juego (1–10)"><ScorePicker value={gameScore} onChange={setGameScore} color={SC.tennis} /></Field>
      <Field label="Movilidad (1–10)"><ScorePicker value={mobilityScore} onChange={setMobilityScore} color={SC.tennis} /></Field>
      <Field label="Notas"><Textarea placeholder="Puntos fuertes, qué mejorar..." value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <SaveBtn onClick={handleSave}>Guardar sesión</SaveBtn>
        <CancelBtn onClick={onCancel} />
      </div>
    </div>
  );
}

// ─── GYM FORM ──────────────────────────────────────────────────────────────
function GymForm({ onSave, onCancel, initial }) {
  const [date, setDate]           = useState(initial?.date || today());
  const [duration, setDuration]   = useState(initial?.duration || "");
  const [exercises, setExercises] = useState(initial?.exercises || [{ name: "", sets: [{ reps: "", weight: "" }] }]);
  const [notes, setNotes]         = useState(initial?.notes || "");

  const addEx      = () => setExercises(e => [...e, { name: "", sets: [{ reps: "", weight: "" }] }]);
  const removeEx   = (i) => setExercises(e => e.filter((_, j) => j !== i));
  const updateName = (i, v) => setExercises(e => e.map((x, j) => j === i ? { ...x, name: v } : x));
  const addSet     = (i) => setExercises(e => e.map((x, j) => j === i ? { ...x, sets: [...x.sets, { reps: "", weight: "" }] } : x));
  const removeSet  = (ei, si) => setExercises(e => e.map((x, j) => j === ei ? { ...x, sets: x.sets.filter((_, k) => k !== si) } : x));
  const updateSet  = (ei, si, f, v) => setExercises(e => e.map((x, j) => j === ei ? { ...x, sets: x.sets.map((s, k) => k === si ? { ...s, [f]: v } : s) } : x));

  const handleSave = () => {
    if (!duration || !date || exercises.length === 0) return;
    onSave({ id: initial?.id || Date.now().toString(), type: "gym", date, duration: parseFloat(duration), exercises, notes });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Field label="Fecha"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="Duración (min)"><Input type="number" placeholder="75" value={duration} onChange={e => setDuration(e.target.value)} /></Field>
      <Field label="Ejercicios">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {exercises.map((ex, ei) => (
            <div key={ei} style={{ background: "#0f172a", borderRadius: 14, border: "1.5px solid #334155", padding: "14px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <Input placeholder={`Ejercicio ${ei + 1}`} value={ex.name} onChange={e => updateName(ei, e.target.value)} style={{ flex: 1 }} />
                <button onClick={() => removeEx(ei)} style={{ background: "#1e293b", border: "1.5px solid #334155", borderRadius: 10, color: "#475569", cursor: "pointer", fontSize: 20, width: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 24px", gap: 6, marginBottom: 8 }}>
                <span />
                <span style={{ fontSize: 10, color: "#475569", textAlign: "center", fontWeight: 600 }}>REPS</span>
                <span style={{ fontSize: 10, color: "#475569", textAlign: "center", fontWeight: 600 }}>PESO kg</span>
                <span />
              </div>
              {ex.sets.map((s, si) => (
                <div key={si} style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 24px", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#475569", textAlign: "center" }}>{si + 1}</span>
                  <Input type="number" placeholder="10" min="0" value={s.reps} onChange={e => updateSet(ei, si, "reps", e.target.value)} style={{ textAlign: "center" }} />
                  <Input type="number" placeholder="60" min="0" step="0.5" value={s.weight} onChange={e => updateSet(ei, si, "weight", e.target.value)} style={{ textAlign: "center" }} />
                  <button onClick={() => removeSet(ei, si)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
                </div>
              ))}
              <button onClick={() => addSet(ei)} style={{ marginTop: 8, background: "#1e293b", border: "1.5px solid #334155", borderRadius: 8, color: "#64748b", fontFamily: "inherit", fontSize: 12, padding: "6px 12px", cursor: "pointer" }}>+ Serie</button>
            </div>
          ))}
          <button onClick={addEx} style={{ background: "#1e293b", border: "1.5px dashed #334155", borderRadius: 12, color: "#64748b", fontFamily: "inherit", fontSize: 14, padding: "12px", cursor: "pointer" }}>
            + Agregar ejercicio
          </button>
        </div>
      </Field>
      <Field label="Notas"><Textarea placeholder="Cómo te sentiste, qué mejorar..." value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <SaveBtn onClick={handleSave}>Guardar sesión</SaveBtn>
        <CancelBtn onClick={onCancel} />
      </div>
    </div>
  );
}

// ─── LOG CARDS ─────────────────────────────────────────────────────────────
function Card({ color, children, onEdit, onDelete }) {
  return (
    <div style={{
      background: "#1e293b", borderRadius: 16, border: "1.5px solid #334155",
      padding: "16px", marginBottom: 10, borderLeft: `3px solid ${color}`,
    }}>
      {children}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <button onClick={onEdit} style={{ fontSize: 12, color: "#64748b", background: "#0f172a", border: "1.5px solid #334155", borderRadius: 8, padding: "5px 12px", fontFamily: "inherit", cursor: "pointer" }}>Editar</button>
        <button onClick={onDelete} style={{ fontSize: 12, color: "#ef4444", background: "#0f172a", border: "1.5px solid #334155", borderRadius: 8, padding: "5px 12px", fontFamily: "inherit", cursor: "pointer" }}>Eliminar</button>
      </div>
    </div>
  );
}

const Dot = ({ label, value, color }) => (
  <span style={{ fontSize: 13, color: "#94a3b8" }}>{label} <span style={{ color, fontWeight: 700 }}>{value}</span></span>
);

function RunCard({ r, onEdit, onDelete }) {
  return (
    <Card color={SC.running} onEdit={onEdit} onDelete={onDelete}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: SC.running, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>{r.subtype}</span>
        <span style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(r.date)}</span>
      </div>
      {r.subtype === "corrida" ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>{r.km.toFixed(1)} <span style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>km</span></span>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
            <Dot label="Duración" value={`${r.minutes.toFixed(0)} min`} color="#f1f5f9" />
            <Dot label="Ritmo" value={`${fmtPace(r.km, r.minutes)}/km`} color={SC.running} />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>{r.reps}×{r.repDist}m</span>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
            <Dot label="Por rep" value={`${r.repTime}s`} color="#f1f5f9" />
            <Dot label="Descanso" value={`${r.rest}s`} color={SC.running} />
          </div>
        </div>
      )}
      {r.notes && <p style={{ fontSize: 13, color: "#64748b", marginTop: 8, fontStyle: "italic" }}>{r.notes}</p>}
    </Card>
  );
}

function TennisCard({ r, onEdit, onDelete }) {
  const won = r.playedSets && r.sets.length > 0
    ? r.sets.filter(s => parseInt(s.me) > parseInt(s.them)).length > r.sets.length / 2
    : null;
  return (
    <Card color={SC.tennis} onEdit={onEdit} onDelete={onDelete}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {r.isClass
            ? <span style={{ fontSize: 12, background: SC.tennis + "22", color: SC.tennis, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>CLASE</span>
            : <span style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9" }}>vs {r.opponent}</span>
          }
        </div>
        <span style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(r.date)}</span>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>{r.duration} min</span>
        {r.playedSets && r.sets.length > 0 && (
          <span style={{ fontSize: 14, fontWeight: 700, color: won ? "#4ade80" : "#f87171" }}>
            {r.sets.map(s => `${s.me}–${s.them}`).join("  ")}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <Dot label="Juego" value={`${r.gameScore}/10`} color={SC.tennis} />
        <Dot label="Movilidad" value={`${r.mobilityScore}/10`} color={SC.tennis} />
      </div>
      {r.notes && <p style={{ fontSize: 13, color: "#64748b", marginTop: 8, fontStyle: "italic" }}>{r.notes}</p>}
    </Card>
  );
}

function GymCard({ r, onEdit, onDelete }) {
  return (
    <Card color={SC.gym} onEdit={onEdit} onDelete={onDelete}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>{r.duration} <span style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>min</span></span>
        <span style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(r.date)}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
        {r.exercises.map((ex, i) => (
          <span key={i} style={{ fontSize: 12, background: SC.gym + "18", color: SC.gym, fontWeight: 600, padding: "4px 10px", borderRadius: 100 }}>
            {ex.name || `Ejercicio ${i + 1}`} · {ex.sets.length}s
          </span>
        ))}
      </div>
      {r.notes && <p style={{ fontSize: 13, color: "#64748b", marginTop: 8, fontStyle: "italic" }}>{r.notes}</p>}
    </Card>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData]         = useState(() => load());
  const [sport, setSport]       = useState("running");
  const [view, setView]         = useState("log");
  const [editItem, setEditItem] = useState(null);

  const persist = useCallback((d) => { save(d); }, []);

  const handleSave = (entry) => {
    const key = entry.type;
    const updated = {
      ...data,
      [key]: editItem
        ? data[key].map(r => r.id === entry.id ? entry : r)
        : [entry, ...data[key]].sort((a, b) => b.date.localeCompare(a.date)),
    };
    setData(updated);
    persist(updated);
    setView("log");
    setEditItem(null);
  };

  const handleDelete = (id) => {
    const updated = { ...data, [sport]: data[sport].filter(r => r.id !== id) };
    setData(updated);
    persist(updated);
  };

  const handleEdit   = (item) => { setEditItem(item); setView("add"); };
  const handleCancel = () => { setView("log"); setEditItem(null); };

  const color = SC[sport];
  const list  = data[sport] || [];
  const totalSessions = Object.values(data).flat().length;

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor: pointer; }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 0 100px" }}>

        {/* Header */}
        <div style={{ padding: "32px 20px 0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Tu progreso</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Sport Log</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>{totalSessions} sesión{totalSessions !== 1 ? "es" : ""} registrada{totalSessions !== 1 ? "s" : ""}</div>
        </div>

        {/* Sport tabs */}
        <div style={{ padding: "24px 20px 0", display: "flex", gap: 8, overflowX: "auto" }}>
          {SPORTS.map(s => {
            const isActive = sport === s.id;
            return (
              <button key={s.id} onClick={() => { setSport(s.id); setView("log"); setEditItem(null); }} style={{
                flexShrink: 0, padding: "10px 20px", borderRadius: 100,
                border: "1.5px solid", borderColor: isActive ? SC[s.id] : "#334155",
                background: isActive ? SC[s.id] + "20" : "#1e293b",
                color: isActive ? SC[s.id] : "#64748b",
                fontFamily: "inherit", fontSize: 14, fontWeight: 600,
                cursor: "pointer", transition: "all 0.18s",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span>{s.emoji}</span>{s.label}
                <span style={{ fontSize: 12, background: isActive ? SC[s.id] + "30" : "#0f172a", color: isActive ? SC[s.id] : "#475569", padding: "1px 7px", borderRadius: 100, marginLeft: 2 }}>
                  {data[s.id]?.length || 0}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: "20px 20px 0" }}>

          {/* Add button */}
          {view === "log" && (
            <button onClick={() => setView("add")} style={{
              width: "100%", padding: "14px", borderRadius: 14,
              border: `1.5px dashed ${color}40`, background: color + "08",
              color, fontFamily: "inherit", fontSize: 14, fontWeight: 600,
              cursor: "pointer", marginBottom: 20, transition: "all 0.18s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
              onMouseEnter={e => e.currentTarget.style.background = color + "15"}
              onMouseLeave={e => e.currentTarget.style.background = color + "08"}
            >
              <span style={{ fontSize: 18 }}>+</span> Nueva sesión de {SPORTS.find(s => s.id === sport)?.label}
            </button>
          )}

          {/* Form */}
          {view === "add" && (
            <div style={{ background: "#1e293b", borderRadius: 20, border: "1.5px solid #334155", padding: "20px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 20 }}>
                {editItem ? "Editar sesión" : `Nueva · ${SPORTS.find(s => s.id === sport)?.label}`}
              </div>
              {sport === "running" && <RunningForm onSave={handleSave} onCancel={handleCancel} initial={editItem} />}
              {sport === "tennis"  && <TennisForm  onSave={handleSave} onCancel={handleCancel} initial={editItem} />}
              {sport === "gym"     && <GymForm     onSave={handleSave} onCancel={handleCancel} initial={editItem} />}
            </div>
          )}

          {/* Log */}
          {view === "log" && (
            list.length === 0
              ? <div style={{ textAlign: "center", color: "#475569", padding: "60px 0", fontSize: 14 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{SPORTS.find(s => s.id === sport)?.emoji}</div>
                  Sin sesiones todavía.<br />
                  <span style={{ color, cursor: "pointer", fontWeight: 600 }} onClick={() => setView("add")}>Registrá tu primera →</span>
                </div>
              : list.map(r => {
                  if (r.type === "running") return <RunCard    key={r.id} r={r} onEdit={() => handleEdit(r)} onDelete={() => handleDelete(r.id)} />;
                  if (r.type === "tennis")  return <TennisCard key={r.id} r={r} onEdit={() => handleEdit(r)} onDelete={() => handleDelete(r.id)} />;
                  if (r.type === "gym")     return <GymCard    key={r.id} r={r} onEdit={() => handleEdit(r)} onDelete={() => handleDelete(r.id)} />;
                  return null;
                })
          )}
        </div>
      </div>
    </div>
  );
}
