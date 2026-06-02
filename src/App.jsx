import { useState, useEffect, useCallback } from "react";

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

const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    {children}
  </div>
);

const Input = ({ style, ...props }) => (
  <input {...props} style={{ background: "#1e293b", border: "1.5px solid #334155", borderRadius: 12, color: "#f1f5f9", fontFamily: "inherit", fontSize: 15, padding: "12px 14px", width: "100%", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s", ...style }}
    onFocus={e => { e.target.style.borderColor = "#64748b"; e.target.style.boxShadow = "0 0 0 3px rgba(100,116,139,0.15)"; }}
    onBlur={e => { e.target.style.borderColor = "#334155"; e.target.style.boxShadow = "none"; }}
  />
);

const Textarea = (props) => (
  <textarea {...props} style={{ background: "#1e293b", border: "1.5px solid #334155", borderRadius: 12, color: "#f1f5f9", fontFamily: "inherit", fontSize: 14, padding: "12px 14px", width: "100%", outline: "none", resize: "vertical", minHeight: 80, transition: "border-color 0.2s" }}
    onFocus={e => e.target.style.borderColor = "#64748b"}
    onBlur={e => e.target.style.borderColor = "#334155"}
  />
);

const Pill = ({ active, color, onClick, children }) => (
  <button onClick={onClick} style={{ padding: "8px 18px", borderRadius: 100, border: "1.5px solid", borderColor: active ? color : "#334155", background: active ? color + "22" : "transparent", color: active ? color : "#64748b", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.18s", whiteSpace: "nowrap" }}>{children}</button>
);

const Toggle = ({ value, onChange, color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onChange(!value)}>
    <div style={{ width: 44, height: 24, borderRadius: 100, position: "relative", background: value ? color : "#334155", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: value ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </div>
    <span style={{ fontSize: 14, color: value ? "#f1f5f9" : "#64748b", fontWeight: 500 }}>{label}</span>
  </div>
);

const ScorePicker = ({ value, onChange, color }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
      <button key={n} onClick={() => onChange(n)} style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid", borderColor: n <= value ? color : "#334155", background: n <= value ? color + "33" : "#1e293b", color: n <= value ? color : "#475569", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>{n}</button>
    ))}
  </div>
);

const Preview = ({ color, children }) => (
  <div style={{ background: color + "11", border: `1px solid ${color}33`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color, fontWeight: 500 }}>{children}</div>
);

const SaveBtn = ({ onClick, children }) => (
  <button onClick={onClick} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 15px rgba(99,102,241,0.35)" }}>{children}</button>
);

const CancelBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ padding: "14px 20px", borderRadius: 14, border: "1.5px solid #334155", background: "transparent", color: "#64748b", fontFamily: "inherit", fontSize: 15, cursor: "pointer" }}>Cancelar</button>
);

const StatCard = ({ label, value, sub, color }) => (
  <div style={{ background: "#1e293b", borderRadius: 16, border: "1.5px solid #334155", padding: "16px", flex: 1 }}>
    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 800, color: color || "#f1f5f9", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{sub}</div>}
  </div>
);

const BarChart = ({ data, color, label, valueKey, labelKey, formatValue }) => {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ background: "#1e293b", borderRadius: 16, border: "1.5px solid #334155", padding: "16px" }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>{label}</div>
      {data.length === 0 ? <div style={{ textAlign: "center", color: "#334155", padding: "20px 0", fontSize: 13 }}>Sin datos todavía</div> : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
          {data.map((d, i) => {
            const h = Math.max((d[valueKey] / max) * 100, 4);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, color: "#64748b" }}>{formatValue ? formatValue(d[valueKey]) : d[valueKey]}</div>
                <div style={{ width: "100%", height: `${h}%`, background: color, borderRadius: "4px 4px 0 0", opacity: 0.85, minHeight: 4 }} />
                <div style={{ fontSize: 9, color: "#475569", whiteSpace: "nowrap" }}>{d[labelKey]}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const LineChart = ({ data, color, label, valueKey, labelKey }) => {
  if (data.length < 2) return (
    <div style={{ background: "#1e293b", borderRadius: 16, border: "1.5px solid #334155", padding: "16px" }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{label}</div>
      <div style={{ textAlign: "center", color: "#334155", padding: "20px 0", fontSize: 13 }}>Necesitás al menos 2 sesiones</div>
    </div>
  );
  const vals = data.map(d => d[valueKey]);
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const W = 300, H = 80, pad = 10;
  const pts = data.map((d, i) => [pad + (i / (data.length - 1)) * (W - pad * 2), pad + ((max - d[valueKey]) / range) * (H - pad * 2)]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const area = `${path} L ${pts[pts.length-1][0]} ${H} L ${pts[0][0]} ${H} Z`;
  const gid = `g${color.replace("#","")}`;
  return (
    <div style={{ background: "#1e293b", borderRadius: 16, border: "1.5px solid #334155", padding: "16px" }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>{label}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 80, overflow: "visible" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={path} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4" fill={color} />)}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: "#475569" }}>{data[0][labelKey]}</span>
        <span style={{ fontSize: 10, color: "#475569" }}>{data[data.length-1][labelKey]}</span>
      </div>
    </div>
  );
};

function RunningDash({ runs }) {
  const color = SC.running;
  const corridas = runs.filter(r => r.subtype === "corrida");
  const pasadas  = runs.filter(r => r.subtype === "pasadas");
  const totalKm  = corridas.reduce((a, r) => a + r.km, 0);
  const totalMin = corridas.reduce((a, r) => a + r.minutes, 0);
  const avgPace  = corridas.length ? fmtPace(totalKm, totalMin) : "--";
  const bestRun  = corridas.reduce((b, r) => (!b || r.km > b.km ? r : b), null);
  const last8    = [...corridas].slice(0, 8).reverse().map(r => ({ km: parseFloat(r.km.toFixed(1)), label: new Date(r.date + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "numeric" }) }));
  const paceEvol = [...corridas].slice(0, 8).reverse().map(r => ({ pace: parseFloat((r.minutes / r.km).toFixed(2)), label: new Date(r.date + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "numeric" }) }));
  if (runs.length === 0) return <EmptyDash />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10 }}><StatCard label="KM Totales" value={totalKm.toFixed(1)} sub={`${corridas.length} corridas`} color={color} /><StatCard label="Ritmo prom." value={avgPace} sub="min/km" /></div>
      <div style={{ display: "flex", gap: 10 }}><StatCard label="Mejor corrida" value={bestRun ? `${bestRun.km.toFixed(1)} km` : "--"} sub={bestRun ? fmtDate(bestRun.date) : ""} /><StatCard label="Pasadas" value={pasadas.length} sub="sesiones" color={color} /></div>
      {last8.length > 0 && <BarChart data={last8} color={color} label="Distancia — últimas salidas" valueKey="km" labelKey="label" formatValue={v => `${v}k`} />}
      {paceEvol.length >= 2 && <LineChart data={paceEvol} color={color} label="Evolución del ritmo (min/km)" valueKey="pace" labelKey="label" />}
    </div>
  );
}

function TennisDash({ runs }) {
  const color = SC.tennis;
  if (runs.length === 0) return <EmptyDash />;
  const partidos = runs.filter(r => !r.isClass);
  const clases   = runs.filter(r => r.isClass);
  const avgGame  = (runs.reduce((a, r) => a + r.gameScore, 0) / runs.length).toFixed(1);
  const avgMob   = (runs.reduce((a, r) => a + r.mobilityScore, 0) / runs.length).toFixed(1);
  const gameEvol = [...runs].slice(0, 8).reverse().map(r => ({ score: r.gameScore, label: new Date(r.date + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "numeric" }) }));
  const mobEvol  = [...runs].slice(0, 8).reverse().map(r => ({ score: r.mobilityScore, label: new Date(r.date + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "numeric" }) }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10 }}><StatCard label="Partidos" value={partidos.length} sub={`${clases.length} clases`} color={color} /><StatCard label="Total sesiones" value={runs.length} /></div>
      <div style={{ display: "flex", gap: 10 }}><StatCard label="Juego prom." value={`${avgGame}/10`} color={color} /><StatCard label="Movilidad prom." value={`${avgMob}/10`} color={color} /></div>
      {gameEvol.length >= 2 && <LineChart data={gameEvol} color={color} label="Evolución — Mi juego" valueKey="score" labelKey="label" />}
      {mobEvol.length >= 2 && <LineChart data={mobEvol} color="#4ECDC4" label="Evolución — Movilidad" valueKey="score" labelKey="label" />}
      <div style={{ background: "#1e293b", borderRadius: 16, border: "1.5px solid #334155", padding: "16px" }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Últimas sesiones</div>
        {runs.slice(0, 5).map(r => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #1e3a5f" }}>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{r.isClass ? "Clase" : `vs ${r.opponent}`}</div><div style={{ fontSize: 11, color: "#475569" }}>{fmtDate(r.date)}</div></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800, color }}>{r.gameScore}</div><div style={{ fontSize: 9, color: "#475569" }}>JUEGO</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800, color: "#4ECDC4" }}>{r.mobilityScore}</div><div style={{ fontSize: 9, color: "#475569" }}>MOVIL.</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GymDash({ runs }) {
  const color = SC.gym;
  if (runs.length === 0) return <EmptyDash />;
  const totalMin = runs.reduce((a, r) => a + r.duration, 0);
  const allEx    = runs.flatMap(r => r.exercises.map(e => e.name)).filter(Boolean);
  const exCount  = allEx.reduce((acc, name) => ({ ...acc, [name]: (acc[name] || 0) + 1 }), {});
  const topEx    = Object.entries(exCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const last8    = [...runs].slice(0, 8).reverse().map(r => ({ min: r.duration, label: new Date(r.date + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "numeric" }) }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10 }}><StatCard label="Sesiones" value={runs.length} color={color} /><StatCard label="Horas totales" value={(totalMin / 60).toFixed(1)} sub="horas entrenadas" /></div>
      <StatCard label="Promedio por sesión" value={`${(totalMin / runs.length).toFixed(0)} min`} />
      {last8.length > 0 && <BarChart data={last8} color={color} label="Duración — últimas sesiones" valueKey="min" labelKey="label" formatValue={v => `${v}m`} />}
      {topEx.length > 0 && (
        <div style={{ background: "#1e293b", borderRadius: 16, border: "1.5px solid #334155", padding: "16px" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Ejercicios más frecuentes</div>
          {topEx.map(([name, count]) => (
            <div key={name} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 500 }}>{name}</span><span style={{ fontSize: 12, color }}>×{count}</span></div>
              <div style={{ height: 4, background: "#334155", borderRadius: 2 }}><div style={{ height: "100%", width: `${(count / topEx[0][1]) * 100}%`, background: color, borderRadius: 2 }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const EmptyDash = () => (
  <div style={{ textAlign: "center", color: "#475569", padding: "60px 0", fontSize: 14 }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
    Registrá algunas sesiones para ver tus estadísticas.
  </div>
);

function RunningForm({ onSave, onCancel, initial }) {
  const [subtype, setSubtype] = useState(initial?.subtype || "corrida");
  const [date, setDate] = useState(initial?.date || today());
  const [inputMode, setInputMode] = useState("duration");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [km, setKm] = useState(initial?.km || "");
  const [minutes, setMinutes] = useState(initial?.minutes || "");
  const [paceMin, setPaceMin] = useState("");
  const [paceSec, setPaceSec] = useState("");
  const [repDist, setRepDist] = useState(initial?.repDist || "");
  const [reps, setReps] = useState(initial?.reps || "");
  const [repTime, setRepTime] = useState(initial?.repTime || "");
  const [rest, setRest] = useState(initial?.rest || "");
  const derivedMin = inputMode === "pace" ? paceToMin(paceMin, paceSec, km) : parseFloat(minutes);
  const handleSave = () => {
    if (subtype === "corrida") { if (!km || !derivedMin || !date) return; onSave({ id: initial?.id || Date.now().toString(), type: "running", subtype, date, km: parseFloat(km), minutes: derivedMin, notes }); }
    else { if (!repDist || !reps || !repTime || !date) return; onSave({ id: initial?.id || Date.now().toString(), type: "running", subtype, date, repDist: parseFloat(repDist), reps: parseInt(reps), repTime: parseFloat(repTime), rest: parseFloat(rest) || 0, notes }); }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Field label="Fecha"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="Tipo"><div style={{ display: "flex", gap: 8 }}><Pill active={subtype === "corrida"} color={SC.running} onClick={() => setSubtype("corrida")}>Corrida</Pill><Pill active={subtype === "pasadas"} color={SC.running} onClick={() => setSubtype("pasadas")}>Pasadas</Pill></div></Field>
      {subtype === "corrida" ? (<>
        <Field label="Distancia (km)"><Input type="number" placeholder="11.0" step="0.1" min="0" value={km} onChange={e => setKm(e.target.value)} /></Field>
        <Field label="Ingresar como"><div style={{ display: "flex", gap: 8 }}><Pill active={inputMode === "duration"} color={SC.running} onClick={() => setInputMode("duration")}>Duración</Pill><Pill active={inputMode === "pace"} color={SC.running} onClick={() => setInputMode("pace")}>Ritmo</Pill></div></Field>
        {inputMode === "duration" ? <Field label="Duración (min)"><Input type="number" placeholder="58" min="0" value={minutes} onChange={e => setMinutes(e.target.value)} /></Field>
          : <Field label="Ritmo (min:seg/km)"><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Input type="number" placeholder="5 min" min="0" max="20" value={paceMin} onChange={e => setPaceMin(e.target.value)} /><Input type="number" placeholder="16 seg" min="0" max="59" value={paceSec} onChange={e => setPaceSec(e.target.value)} /></div></Field>}
        {km && derivedMin ? <Preview color={SC.running}>{inputMode === "pace" ? `Duración total: ${derivedMin.toFixed(1)} min` : `Ritmo: ${fmtPace(parseFloat(km), parseFloat(minutes))} min/km`}</Preview> : null}
      </>) : (<>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Dist/rep (m)"><Input type="number" placeholder="400" value={repDist} onChange={e => setRepDist(e.target.value)} /></Field>
          <Field label="Reps"><Input type="number" placeholder="8" value={reps} onChange={e => setReps(e.target.value)} /></Field>
          <Field label="Tiempo/rep (s)"><Input type="number" placeholder="90" value={repTime} onChange={e => setRepTime(e.target.value)} /></Field>
          <Field label="Descanso (s)"><Input type="number" placeholder="60" value={rest} onChange={e => setRest(e.target.value)} /></Field>
        </div>
        {repDist && reps && repTime && <Preview color={SC.running}>{((parseFloat(repDist)*parseInt(reps))/1000).toFixed(2)} km · {((parseFloat(repTime)*parseInt(reps))/60).toFixed(1)} min</Preview>}
      </>)}
      <Field label="Notas"><Textarea placeholder="Cómo te sentiste..." value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      <div style={{ display: "flex", gap: 10 }}><SaveBtn onClick={handleSave}>Guardar</SaveBtn><CancelBtn onClick={onCancel} /></div>
    </div>
  );
}

function TennisForm({ onSave, onCancel, initial }) {
  const [date, setDate] = useState(initial?.date || today());
  const [isClass, setIsClass] = useState(initial?.isClass ?? false);
  const [opponent, setOpponent] = useState(initial?.opponent || "");
  const [duration, setDuration] = useState(initial?.duration || "");
  const [playedSets, setPlayedSets] = useState(initial?.playedSets ?? false);
  const [sets, setSets] = useState(initial?.sets || [{ me: "", them: "" }]);
  const [gameScore, setGameScore] = useState(initial?.gameScore || 0);
  const [mobilityScore, setMobilityScore] = useState(initial?.mobilityScore || 0);
  const [notes, setNotes] = useState(initial?.notes || "");
  const addSet = () => setSets(s => [...s, { me: "", them: "" }]);
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
      {!isClass && <Field label="Oponente"><Input type="text" placeholder="Nombre" value={opponent} onChange={e => setOpponent(e.target.value)} /></Field>}
      <Field label="Duración (min)"><Input type="number" placeholder="90" value={duration} onChange={e => setDuration(e.target.value)} /></Field>
      <Toggle value={playedSets} onChange={setPlayedSets} color={SC.tennis} label="Jugué sets" />
      {playedSets && (
        <Field label="Resultado por set">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 28px", gap: 8 }}><span /><span style={{ fontSize: 11, color: "#64748b", textAlign: "center", fontWeight: 600 }}>YO</span><span style={{ fontSize: 11, color: "#64748b", textAlign: "center", fontWeight: 600 }}>RIVAL</span><span /></div>
            {sets.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 28px", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#475569", textAlign: "center", fontWeight: 600 }}>{i + 1}</span>
                <Input type="number" placeholder="6" min="0" max="7" value={s.me} onChange={e => updateSet(i, "me", e.target.value)} style={{ textAlign: "center" }} />
                <Input type="number" placeholder="4" min="0" max="7" value={s.them} onChange={e => updateSet(i, "them", e.target.value)} style={{ textAlign: "center" }} />
                <button onClick={() => removeSet(i)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 20, padding: 0 }}>×</button>
              </div>
            ))}
            <button onClick={addSet} style={{ alignSelf: "flex-start", background: "#1e293b", border: "1.5px solid #334155", borderRadius: 8, color: "#64748b", fontFamily: "inherit", fontSize: 13, padding: "7px 14px", cursor: "pointer" }}>+ Set</button>
          </div>
        </Field>
      )}
      <Field label="Mi juego (1–10)"><ScorePicker value={gameScore} onChange={setGameScore} color={SC.tennis} /></Field>
      <Field label="Movilidad (1–10)"><ScorePicker value={mobilityScore} onChange={setMobilityScore} color={SC.tennis} /></Field>
      <Field label="Notas"><Textarea placeholder="Puntos fuertes, qué mejorar..." value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      <div style={{ display: "flex", gap: 10 }}><SaveBtn onClick={handleSave}>Guardar</SaveBtn><CancelBtn onClick={onCancel} /></div>
    </div>
  );
}

function GymForm({ onSave, onCancel, initial }) {
  const [date, setDate] = useState(initial?.date || today());
  const [duration, setDuration] = useState(initial?.duration || "");
  const [exercises, setExercises] = useState(initial?.exercises || [{ name: "", sets: [{ reps: "", weight: "" }] }]);
  const [notes, setNotes] = useState(initial?.notes || "");
  const addEx = () => setExercises(e => [...e, { name: "", sets: [{ reps: "", weight: "" }] }]);
  const removeEx = (i) => setExercises(e => e.filter((_, j) => j !== i));
  const updateName = (i, v) => setExercises(e => e.map((x, j) => j === i ? { ...x, name: v } : x));
  const addSet = (i) => setExercises(e => e.map((x, j) => j === i ? { ...x, sets: [...x.sets, { reps: "", weight: "" }] } : x));
  const removeSet = (ei, si) => setExercises(e => e.map((x, j) => j === ei ? { ...x, sets: x.sets.filter((_, k) => k !== si) } : x));
  const updateSet = (ei, si, f, v) => setExercises(e => e.map((x, j) => j === ei ? { ...x, sets: x.sets.map((s, k) => k === si ? { ...s, [f]: v } : s) } : x));
  const handleSave = () => {
    if (!duration || !date) return;
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
                <span /><span style={{ fontSize: 10, color: "#475569", textAlign: "center", fontWeight: 600 }}>REPS</span><span style={{ fontSize: 10, color: "#475569", textAlign: "center", fontWeight: 600 }}>PESO kg</span><span />
              </div>
              {ex.sets.map((s, si) => (
                <div key={si} style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 24px", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#475569", textAlign: "center" }}>{si + 1}</span>
                  <Input type="number" placeholder="10" min="0" value={s.reps} onChange={e => updateSet(ei, si, "reps", e.target.value)} style={{ textAlign: "center" }} />
                  <Input type="number" placeholder="60" min="0" step="0.5" value={s.weight} onChange={e => updateSet(ei, si, "weight", e.target.value)} style={{ textAlign: "center" }} />
                  <button onClick={() => removeSet(ei, si)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
                </div>
              ))}
              <button onClick={() => addSet(ei)} style={{ marginTop: 8, background: "#1e293b", border: "1.5px solid #334155", borderRadius: 8, color: "#64748b", fontFamily: "inherit", fontSize: 12, padding: "6px 12px", cursor: "pointer" }}>+ Serie</button>
            </div>
          ))}
          <button onClick={addEx} style={{ background: "#1e293b", border: "1.5px dashed #334155", borderRadius: 12, color: "#64748b", fontFamily: "inherit", fontSize: 14, padding: "12px", cursor: "pointer" }}>+ Agregar ejercicio</button>
        </div>
      </Field>
      <Field label="Notas"><Textarea placeholder="Cómo te sentiste..." value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      <div style={{ display: "flex", gap: 10 }}><SaveBtn onClick={handleSave}>Guardar</SaveBtn><CancelBtn onClick={onCancel} /></div>
    </div>
  );
}

function Card({ color, children, onEdit, onDelete }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: 16, border: "1.5px solid #334155", padding: "16px", marginBottom: 10, borderLeft: `3px solid ${color}` }}>
      {children}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <button onClick={onEdit} style={{ fontSize: 12, color: "#64748b", background: "#0f172a", border: "1.5px solid #334155", borderRadius: 8, padding: "5px 12px", fontFamily: "inherit", cursor: "pointer" }}>Editar</button>
        <button onClick={onDelete} style={{ fontSize: 12, color: "#ef4444", background: "#0f172a", border: "1.5px solid #334155", borderRadius: 8, padding: "5px 12px", fontFamily: "inherit", cursor: "pointer" }}>Eliminar</button>
      </div>
    </div>
  );
}

const Dot = ({ label, value, color }) => <span style={{ fontSize: 13, color: "#94a3b8" }}>{label} <span style={{ color, fontWeight: 700 }}>{value}</span></span>;

function RunCard({ r, onEdit, onDelete }) {
  return (
    <Card color={SC.running} onEdit={onEdit} onDelete={onDelete}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 12, color: SC.running, fontWeight: 700, textTransform: "uppercase" }}>{r.subtype}</span><span style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(r.date)}</span></div>
      {r.subtype === "corrida" ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9" }}>{r.km.toFixed(1)} <span style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>km</span></span>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}><Dot label="Duración" value={`${r.minutes.toFixed(0)} min`} color="#f1f5f9" /><Dot label="Ritmo" value={`${fmtPace(r.km, r.minutes)}/km`} color={SC.running} /></div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9" }}>{r.reps}×{r.repDist}m</span>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}><Dot label="Por rep" value={`${r.repTime}s`} color="#f1f5f9" /><Dot label="Descanso" value={`${r.rest}s`} color={SC.running} /></div>
        </div>
      )}
      {r.notes && <p style={{ fontSize: 13, color: "#64748b", marginTop: 8, fontStyle: "italic" }}>{r.notes}</p>}
    </Card>
  );
}

function TennisCard({ r, onEdit, onDelete }) {
  const won = r.playedSets && r.sets.length > 0 ? r.sets.filter(s => parseInt(s.me) > parseInt(s.them)).length > r.sets.length / 2 : null;
  return (
    <Card color={SC.tennis} onEdit={onEdit} onDelete={onDelete}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div>{r.isClass ? <span style={{ fontSize: 12, background: SC.tennis + "22", color: SC.tennis, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>CLASE</span> : <span style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9" }}>vs {r.opponent}</span>}</div>
        <span style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(r.date)}</span>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>{r.duration} min</span>
        {r.playedSets && r.sets.length > 0 && <span style={{ fontSize: 14, fontWeight: 700, color: won ? "#4ade80" : "#f87171" }}>{r.sets.map(s => `${s.me}–${s.them}`).join("  ")}</span>}
      </div>
      <div style={{ display: "flex", gap: 16 }}><Dot label="Juego" value={`${r.gameScore}/10`} color={SC.tennis} /><Dot label="Movilidad" value={`${r.mobilityScore}/10`} color={SC.tennis} /></div>
      {r.notes && <p style={{ fontSize: 13, color: "#64748b", marginTop: 8, fontStyle: "italic" }}>{r.notes}</p>}
    </Card>
  );
}

function GymCard({ r, onEdit, onDelete }) {
  return (
    <Card color={SC.gym} onEdit={onEdit} onDelete={onDelete}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9" }}>{r.duration} <span style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>min</span></span>
        <span style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(r.date)}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {r.exercises.map((ex, i) => <span key={i} style={{ fontSize: 12, background: SC.gym + "18", color: SC.gym, fontWeight: 600, padding: "4px 10px", borderRadius: 100 }}>{ex.name || `Ej. ${i+1}`} · {ex.sets.length}s</span>)}
      </div>
      {r.notes && <p style={{ fontSize: 13, color: "#64748b", marginTop: 8, fontStyle: "italic" }}>{r.notes}</p>}
    </Card>
  );
}

export default function App() {
  const [data, setData]         = useState(() => load());
  const [sport, setSport]       = useState("running");
  const [view, setView]         = useState("log");
  const [editItem, setEditItem] = useState(null);

  const persist = useCallback((d) => { save(d); }, []);

  const handleSave = (entry) => {
    const key = entry.type;
    const updated = { ...data, [key]: editItem ? data[key].map(r => r.id === entry.id ? entry : r) : [entry, ...data[key]].sort((a, b) => b.date.localeCompare(a.date)) };
    setData(updated); persist(updated); setView("log"); setEditItem(null);
  };

  const handleDelete = (id) => {
    const updated = { ...data, [sport]: data[sport].filter(r => r.id !== id) };
    setData(updated); persist(updated);
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
        <div style={{ padding: "32px 20px 0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Tu progreso</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Sport Log</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>{totalSessions} sesión{totalSessions !== 1 ? "es" : ""} registrada{totalSessions !== 1 ? "s" : ""}</div>
        </div>

        <div style={{ padding: "24px 20px 0", display: "flex", gap: 8, overflowX: "auto" }}>
          {SPORTS.map(s => {
            const isActive = sport === s.id;
            return (
              <button key={s.id} onClick={() => { setSport(s.id); setView("log"); setEditItem(null); }} style={{ flexShrink: 0, padding: "10px 20px", borderRadius: 100, border: "1.5px solid", borderColor: isActive ? SC[s.id] : "#334155", background: isActive ? SC[s.id] + "20" : "#1e293b", color: isActive ? SC[s.id] : "#64748b", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.18s", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{s.emoji}</span>{s.label}
                <span style={{ fontSize: 12, background: isActive ? SC[s.id] + "30" : "#0f172a", color: isActive ? SC[s.id] : "#475569", padding: "1px 7px", borderRadius: 100, marginLeft: 2 }}>{data[s.id]?.length || 0}</span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: "16px 20px 0", display: "flex", gap: 4, alignItems: "center" }}>
          {[["log","Historial"], ["stats","Estadísticas"]].map(([v, label]) => (
            <button key={v} onClick={() => { setView(v); setEditItem(null); }} style={{ padding: "8px 18px", borderRadius: 100, border: "1.5px solid", borderColor: view === v ? color : "#334155", background: view === v ? color + "18" : "transparent", color: view === v ? color : "#64748b", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.18s" }}>{label}</button>
          ))}
          <button onClick={() => { setView("add"); setEditItem(null); }} style={{ marginLeft: "auto", padding: "8px 20px", borderRadius: 100, border: "none", background: color, color: "#000", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Nueva</button>
        </div>

        <div style={{ padding: "16px 20px 0" }}>
          {view === "add" && (
            <div style={{ background: "#1e293b", borderRadius: 20, border: "1.5px solid #334155", padding: "20px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 20 }}>{editItem ? "Editar sesión" : `Nueva · ${SPORTS.find(s => s.id === sport)?.label}`}</div>
              {sport === "running" && <RunningForm onSave={handleSave} onCancel={handleCancel} initial={editItem} />}
              {sport === "tennis"  && <TennisForm  onSave={handleSave} onCancel={handleCancel} initial={editItem} />}
              {sport === "gym"     && <GymForm     onSave={handleSave} onCancel={handleCancel} initial={editItem} />}
            </div>
          )}

          {view === "stats" && (
            <>
              {sport === "running" && <RunningDash runs={data.running} />}
              {sport === "tennis"  && <TennisDash  runs={data.tennis} />}
              {sport === "gym"     && <GymDash     runs={data.gym} />}
            </>
          )}

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
