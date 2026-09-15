import { useState, useEffect, useRef, Component } from "react";
import * as XLSX from "xlsx";
import * as api from "./lib/api";
import { supabaseConfigured } from "./lib/supabaseClient";
import {
  LogIn, Building2, User, ArrowLeft, Plus, CheckCircle2, Clock3,
  Wallet, Users, LogOut, AlertCircle, Loader2, X,
  ShieldCheck, TrendingDown, Zap, FileCheck,
  ChevronDown, Check, ArrowRight, Mail, Phone, MessageCircleQuestion,
  PlayCircle, AlertTriangle, HeartHandshake, Smartphone, Server,
  MessagesSquare, Globe, AtSign, Share2,
} from "lucide-react";

/* =======================================================================
   VANZA — single integrated application
   · Public marketing website (sells the service to companies)
   · Behind "Iniciar sesión": the real product (employee + company logins,
     backed by Supabase — see src/lib/api.ts and supabase/schema.sql)
   Design: deep plum ground + warm gold (earned coin) + soft teal (relief).
======================================================================= */

const C = {
  bg: "#241726",
  bgAlt: "#1D1220",
  card: "#3A2640",
  cardBorder: "#4C3350",
  gold: "#D9A24B",
  goldSoft: "#F0C78A",
  teal: "#4FB0A0",
  tealSoft: "#8FD4C8",
  ink: "#F6EEE9",
  inkDim: "#C9B8C6",
  inkFaint: "#8E7B8C",
  danger: "#E08A6B",
};
const DISPLAY = "'Fraunces', ui-serif, Georgia, serif";
const BODY = "'Inter', ui-sans-serif, system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

const FONT_LINK_ID = "avance-fonts";
function ensureFonts() {
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap";
  document.head.appendChild(link);
}

const GLOBAL_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  html { scroll-behavior: smooth; }
  a, button, input, textarea { font-family: inherit; }
  :focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
  .spin { animation: av-spin 1s linear infinite; }
  @keyframes av-spin { to { transform: rotate(360deg); } }

  /* --- 2027-ish polish: glass cards, glow, reveal-on-scroll, skeletons --- */
  .av-card {
    background: ${C.card}CC;
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    border: 1px solid ${C.cardBorder};
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease;
  }
  .av-card-hoverable:hover {
    transform: translateY(-3px);
    border-color: ${C.gold}66;
    box-shadow: 0 16px 40px -20px #00000090, 0 0 0 1px ${C.gold}22;
  }
  .av-btn { transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease, filter 0.18s ease; }
  .av-btn:hover { transform: translateY(-2px); filter: brightness(1.06); }
  .av-btn:active { transform: translateY(0) scale(0.97); }

  .av-glow-orb {
    position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none;
    animation: av-drift 12s ease-in-out infinite alternate;
  }
  @keyframes av-drift {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-14px, 18px) scale(1.08); }
  }
  @keyframes av-ping {
    0% { transform: scale(0.9); opacity: 0.9; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  .av-reveal { opacity: 0; transform: translateY(22px); transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
  .av-reveal.av-in { opacity: 1; transform: translateY(0); }

  @keyframes av-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
  .av-skeleton {
    background: linear-gradient(90deg, ${C.card} 25%, ${C.cardBorder} 50%, ${C.card} 75%);
    background-size: 800px 100%;
    animation: av-shimmer 1.6s linear infinite;
    border-radius: 8px;
  }

  @keyframes av-fade-scale { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
  .av-fade-scale { animation: av-fade-scale 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }

  /* --- marketing site grids --- */
  .av-nav-links { display: flex; gap: 26px; }
  .av-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .av-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .av-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .av-plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .av-contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .av-hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 40px; align-items: center; }
  .av-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 24px; }
  @media (max-width: 900px) {
    .av-nav-links { display: none; }
    .av-grid-3 { grid-template-columns: 1fr 1fr; }
    .av-grid-4 { grid-template-columns: 1fr 1fr; }
    .av-grid-2 { grid-template-columns: 1fr; }
    .av-plans { grid-template-columns: 1fr; }
    .av-contact-grid { grid-template-columns: 1fr; }
    .av-hero-grid { grid-template-columns: 1fr; }
    .av-footer-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 560px) {
    .av-grid-3 { grid-template-columns: 1fr; }
    .av-grid-4 { grid-template-columns: 1fr; }
    .av-footer-grid { grid-template-columns: 1fr; }
  }

  /* --- app dashboards grids --- */
  .av-dash-grid { display: grid; grid-template-columns: minmax(240px, 320px) 1fr; gap: 20px; }
  .av-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
  .av-table-row { display: grid; grid-template-columns: repeat(4, 1fr); align-items: center; gap: 6px; }
  .av-table-head { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .av-table-row-5 { grid-template-columns: 1.4fr 1fr 0.8fr 1fr 1.2fr; }
  .av-table-head-5 { grid-template-columns: 1.4fr 1fr 0.8fr 1fr 1.2fr; }
  .av-cards { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
  @media (max-width: 700px) {
    .av-dash-grid { grid-template-columns: 1fr; }
    .av-table-row, .av-table-head { grid-template-columns: repeat(4, minmax(90px, 1fr)); overflow-x: auto; font-size: 12px; }
    .av-table-row-5, .av-table-head-5 { grid-template-columns: repeat(5, minmax(74px, 1fr)); overflow-x: auto; font-size: 11.5px; }
  }
`;

function GlobalStyle() {
  return <style>{GLOBAL_CSS}</style>;
}

/* ---------------------------------------------------------------------
   UTIL
------------------------------------------------------------------- */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

const fmt = (n) => "RD$" + Math.round(n).toLocaleString("es-DO");

// Día transcurrido dentro de la quincena vigente, según la fecha real del
// sistema (no un contador arbitrario). Días 1-15 del mes → ese mismo número.
// Días 16 en adelante → se cuenta desde el 16 (segunda quincena).
// Ejemplos: 6 de julio → día 6. 22 de julio → día 7 (22-15=7, ya en la
// segunda quincena).
function currentCycleDay(base) {
  const now = base || new Date();
  const day = now.getDate();
  return day <= 15 ? day : day - 15;
}
function computeFee(amount) {
  if (amount <= 2000) return 50;
  if (amount <= 5000) return 100;
  return 150;
}
function computeCuotas(amount) {
  if (amount <= 3000) return 1;
  if (amount <= 7000) return 2;
  return 3;
}

// Comprime una foto de comprobante antes de guardarla — reduce a un ancho
// máximo razonable y JPEG calidad media, de sobra para verificar una
// transferencia, y evita mandar fotos de cámara de varios MB a la base de datos.
function compressImageFile(file, maxWidth = 900, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------------------------------------------------------------------
   SHARED ATOMS (used by both the website and the app)
------------------------------------------------------------------- */
function Card({ children, style, hoverable = true }) {
  return (
    <div className={`av-card${hoverable ? " av-card-hoverable" : ""}`} style={{ borderRadius: 16, padding: 22, ...style }}>
      {children}
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span style={{ fontFamily: BODY, fontSize: 12.5, color: C.inkDim, fontWeight: 600, letterSpacing: 0.3 }}>{label}</span>
      <input
        {...props}
        style={{
          width: "100%", marginTop: 6, padding: "11px 13px", borderRadius: 9,
          border: `1px solid ${C.cardBorder}`, background: C.bgAlt, color: C.ink,
          fontFamily: BODY, fontSize: 15, outline: "none", boxSizing: "border-box",
        }}
      />
    </label>
  );
}

function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.danger, fontFamily: BODY, fontSize: 13.5, marginBottom: 14 }}>
      <AlertCircle size={15} />
      {children}
    </div>
  );
}

function EmptyNote({ children }) {
  return <p style={{ fontFamily: BODY, fontSize: 13.5, color: C.inkFaint, fontStyle: "italic" }}>{children}</p>;
}

function Logo({ size = 22 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ width: size + 10, height: size + 10, borderRadius: 8, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Wallet size={size - 4} color="#2B1B0F" strokeWidth={2.4} />
      </div>
      <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: size, color: C.ink }}>Vanza</span>
    </div>
  );
}

// Button used inside the app (dashboards / forms)
function Button({ children, onClick, variant = "primary", disabled, type = "button", style }) {
  const base = {
    fontFamily: BODY, fontWeight: 600, fontSize: 14.5, borderRadius: 10,
    padding: "12px 20px", border: "none", cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
  };
  const variants = {
    primary: { background: C.gold, color: "#2B1B0F", boxShadow: `0 8px 24px -12px ${C.gold}99` },
    secondary: { background: "transparent", color: C.ink, border: `1px solid ${C.cardBorder}` },
    teal: { background: C.teal, color: "#0F2A26", boxShadow: `0 8px 24px -12px ${C.teal}99` },
    ghost: { background: "transparent", color: C.inkDim },
  };
  return (
    <button
      type={type} onClick={disabled ? undefined : onClick} disabled={disabled}
      className="av-btn"
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

// Buttons used on the marketing website (support href for in-page anchors)
function PrimaryButton({ children, onClick, href, type, disabled, style }) {
  const Tag = href ? "a" : "button";
  return (
    <Tag
      href={href} onClick={onClick} type={type} disabled={disabled} className="av-btn"
      style={{
        fontFamily: BODY, fontWeight: 700, fontSize: 15, borderRadius: 11, padding: "13px 24px",
        border: "none", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
        background: C.gold, color: "#2B1B0F", display: "inline-flex", alignItems: "center", gap: 8,
        textDecoration: "none", boxShadow: `0 10px 30px -14px ${C.gold}AA`, ...style,
      }}
    >
      {children}
    </Tag>
  );
}
function GhostButton({ children, onClick, href, style }) {
  const Tag = href ? "a" : "button";
  const external = href && href.startsWith("http");
  return (
    <Tag
      href={href} onClick={onClick} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}
      className="av-btn"
      style={{
        fontFamily: BODY, fontWeight: 600, fontSize: 15, borderRadius: 11, padding: "12px 22px",
        border: `1px solid ${C.cardBorder}`, cursor: "pointer", background: "transparent", color: C.ink,
        display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", ...style,
      }}
    >
      {children}
    </Tag>
  );
}

/* ---------------------------------------------------------------------
   SIGNATURE ELEMENT — Payday progress ring (app)
------------------------------------------------------------------- */
function PaydayRing({ day, size = 132 }) {
  const total = 15;
  const pct = (day + 1) / total;
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.cardBorder} strokeWidth="10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.gold} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: DISPLAY, fontSize: 26, color: C.ink, fontWeight: 700, lineHeight: 1 }}>{day + 1}</span>
        <span style={{ fontFamily: BODY, fontSize: 11, color: C.inkDim, marginTop: 2 }}>de 15 días</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   Reveal — fades/slides content in the first time it scrolls into view.
   Falls back to always-visible if IntersectionObserver isn't available.
------------------------------------------------------------------- */
function Reveal({ children, style }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`av-reveal${visible ? " av-in" : ""}`} style={style}>
      {children}
    </div>
  );
}

// Animates a number counting up from 0 the first time it scrolls into view.
function useCountUp(target, { duration = 1100 } = {}) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") { setValue(target); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(Math.round(target * eased));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return [ref, value];
}

/* =======================================================================
   PART 1 — MARKETING WEBSITE
======================================================================= */
function Section({ id, children, style }) {
  return (
    <section id={id} style={{ padding: "72px 24px", ...style }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}><Reveal>{children}</Reveal></div>
    </section>
  );
}
function Eyebrow({ children, color = C.gold }) {
  return (
    <div style={{ fontFamily: BODY, fontSize: 13, fontWeight: 700, letterSpacing: 2, color, textTransform: "uppercase", marginBottom: 12 }}>
      {children}
    </div>
  );
}
function H2({ children }) {
  return (
    <h2 style={{ fontFamily: DISPLAY, fontSize: "clamp(26px, 4vw, 36px)", color: C.ink, fontWeight: 600, margin: "0 0 16px", lineHeight: 1.2 }}>
      {children}
    </h2>
  );
}

function Nav({ onLogin }) {
  const links = [
    ["El problema", "#problema"], ["Solución", "#solucion"], ["Cómo funciona", "#como-funciona"],
    ["Beneficios", "#beneficios"], ["Planes", "#planes"], ["Preguntas", "#faq"],
  ];
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 30, background: `${C.bgAlt}EE`, backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.cardBorder}` }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={16} color="#2B1B0F" strokeWidth={2.4} />
          </div>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20, color: C.ink }}>Vanza</span>
        </div>
        <nav className="av-nav-links">
          {links.map(([label, href]) => (
            <a key={href} href={href} style={{ fontFamily: BODY, fontSize: 13.5, color: C.inkDim, textDecoration: "none", fontWeight: 500 }}>{label}</a>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={onLogin} style={{ background: "none", border: "none", color: C.inkDim, fontFamily: BODY, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
            Iniciar sesión
          </button>
          <PrimaryButton href="#contacto" style={{ padding: "9px 16px", fontSize: 13 }}>Solicitar propuesta</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function Inicio() {
  return (
    <Section style={{ paddingTop: 72, paddingBottom: 60, position: "relative", overflow: "hidden" }}>
      <div className="av-glow-orb" style={{ top: -140, right: -160, width: 380, height: 380, background: C.gold, opacity: 0.22 }} />
      <div className="av-glow-orb" style={{ bottom: -100, left: -120, width: 300, height: 300, background: C.teal, opacity: 0.16, animationDelay: "-4s" }} />
      <div className="av-hero-grid" style={{ position: "relative" }}>
        <div>
          <Eyebrow>Plataforma de salario bajo demanda</Eyebrow>
          <h1 style={{ fontFamily: DISPLAY, fontSize: "clamp(30px, 5vw, 48px)", color: C.ink, fontWeight: 700, lineHeight: 1.14, margin: "0 0 18px" }}>
            Un beneficio que reduce la rotación de tu personal — a costo cero de implementación.
          </h1>
          <p style={{ fontFamily: BODY, fontSize: 16.5, color: C.inkDim, maxWidth: 480, margin: "0 0 30px", lineHeight: 1.6 }}>
            Vanza permite que tus colaboradores accedan a una porción del salario que ya han devengado en la quincena en curso, antes de la fecha de pago, sin que tu empresa adelante capital ni asuma riesgo de flujo de caja.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <PrimaryButton href="#contacto">Solicitar una propuesta <ArrowRight size={16} /></PrimaryButton>
            <GhostButton href={waLink("Hola, me gustaría hablar con un asesor de Vanza sobre los planes disponibles y cómo funciona la plataforma para mi empresa.")}><MessagesSquare size={16} /> Hablar con un asesor</GhostButton>
          </div>
          <div style={{ marginTop: 40, display: "flex", gap: 32, flexWrap: "wrap" }}>
            {[["0", "costo de implementación"], ["<24h", "tiempo de desembolso"], ["100%", "operado por Vanza"]].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontFamily: MONO, fontSize: 24, color: C.gold, fontWeight: 600 }}>{n}</div>
                <div style={{ fontFamily: BODY, fontSize: 12, color: C.inkFaint }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <Card hoverable={false} style={{ padding: 0, overflow: "hidden", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", background: `linear-gradient(160deg, ${C.card}, ${C.bgAlt})` }}>
          <span style={{ position: "absolute", width: 96, height: 96, borderRadius: "50%", border: `1.5px solid ${C.gold}55`, animation: "av-ping 2.2s cubic-bezier(0,0,0.2,1) infinite" }} />
          <button
            className="av-btn"
            onClick={() => window.open(waLink("Hola, me gustaría ver una demostración de cómo funciona Vanza."), "_blank")}
            style={{ background: "rgba(217,162,75,0.15)", border: `1.5px solid ${C.gold}`, borderRadius: "50%", width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            aria-label="Solicitar demostración"
          >
            <PlayCircle size={36} color={C.gold} />
          </button>
          <span style={{ position: "absolute", bottom: 18, fontFamily: BODY, fontSize: 12.5, color: C.inkFaint }}>Video: así se ve Vanza en 90 segundos</span>
        </Card>
      </div>
    </Section>
  );
}

function ElProblema() {
  const retos = [
    [AlertTriangle, "Rotación costosa", "Reemplazar a un empleado cuesta entre RD$15,000 y RD$40,000 — y buena parte renuncia por estrés financiero."],
    [TrendingDown, "Estrés financiero real", "Muchos colaboradores llegan a fin de quincena sin liquidez y recurren a prestamistas informales al 20% mensual."],
    [Users, "Carga administrativa", "Los adelantos manuales de nómina consumen horas de RRHH cada mes, sin ninguna herramienta que lo ordene."],
  ];
  return (
    <Section id="problema">
      <Eyebrow color={C.danger}>El problema</Eyebrow>
      <H2>Los retos que enfrentan las empresas con el bienestar financiero de sus colaboradores</H2>
      <div className="av-grid-3" style={{ marginTop: 28 }}>
        {retos.map(([Icon, title, desc], i) => (
          <Card key={i}>
            <Icon size={22} color={C.danger} style={{ marginBottom: 12 }} />
            <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 15.5, color: C.ink, marginBottom: 8 }}>{title}</div>
            <div style={{ fontFamily: BODY, fontSize: 13.5, color: C.inkDim, lineHeight: 1.5 }}>{desc}</div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function NuestraSolucion() {
  const roles = [
    [Building2, "Qué hace la empresa", "Firma un solo acuerdo y conecta su sistema de nómina. No adelanta capital ni gestiona los adelantos manualmente.", C.gold],
    [User, "Qué hace el colaborador", "Consulta cuánto ha devengado y solicita un adelanto desde la app, cuando lo necesite.", C.teal],
    [Server, "Qué hace la plataforma", "Financia el adelanto con su propio fondo revolvente, y recupera el monto automáticamente vía nómina.", C.tealSoft],
  ];
  return (
    <Section id="solucion" style={{ background: C.bgAlt, borderRadius: 28 }}>
      <Eyebrow color={C.teal}>Nuestra solución</Eyebrow>
      <H2>Una plataforma, tres roles claros</H2>
      <p style={{ fontFamily: BODY, fontSize: 15, color: C.inkDim, maxWidth: 620, marginBottom: 8 }}>
        Vanza conecta a la empresa, al colaborador y al fondo que financia los adelantos — cada uno con una función simple y bien delimitada.
      </p>
      <div className="av-grid-3" style={{ marginTop: 24 }}>
        {roles.map(([Icon, title, desc, color], i) => (
          <Card key={i}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Icon size={19} color={color} />
            </div>
            <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 15.5, color: C.ink, marginBottom: 8 }}>{title}</div>
            <div style={{ fontFamily: BODY, fontSize: 13.5, color: C.inkDim, lineHeight: 1.5 }}>{desc}</div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function ComoFunciona() {
  const steps = [
    ["01", "La empresa solicita una propuesta", "Nos cuentas el tamaño de tu plantilla y te armamos un plan a la medida."],
    ["02", "Se afilia e integra la nómina", "Firmas el acuerdo y conectamos vía API o archivo cifrado — sin desarrollo a medida."],
    ["03", "Los colaboradores utilizan la app", "Consultan su devengado y piden adelantos cuando los necesiten, desde su celular."],
    ["04", "La plataforma administra todo el proceso", "Vanza financia, cobra la tarifa y recupera el monto en la nómina — de forma automática."],
  ];
  return (
    <Section id="como-funciona">
      <Eyebrow color={C.teal}>Cómo funciona</Eyebrow>
      <H2>Cuatro pasos, cero fricción operativa</H2>
      <div className="av-grid-4" style={{ marginTop: 28 }}>
        {steps.map(([n, title, desc]) => (
          <Card key={n}>
            <div style={{ fontFamily: MONO, fontSize: 22, color: C.teal, fontWeight: 600, marginBottom: 10 }}>{n}</div>
            <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 8 }}>{title}</div>
            <div style={{ fontFamily: BODY, fontSize: 13.5, color: C.inkDim, lineHeight: 1.5 }}>{desc}</div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function Beneficios() {
  const empresa = [
    [ShieldCheck, "Cero riesgo de flujo de caja", "Tu empresa nunca adelanta capital propio."],
    [Zap, "Implementación en días", "Sin desarrollo a medida, conexión estándar a tu nómina."],
    [FileCheck, "Cumplimiento regulatorio", "Operamos bajo el marco EPE de la Junta Monetaria."],
    [Users, "Cero carga administrativa", "RRHH deja de procesar adelantos uno por uno."],
  ];
  const colaborador = [
    [Wallet, "Acceso a su propio dinero", "No es un préstamo — es el salario que ya ganó."],
    [TrendingDown, "Sin intereses", "Tarifa fija y transparente, muy por debajo del prestamista informal."],
    [Smartphone, "Todo desde el celular", "Solicita, recibe y da seguimiento sin filas ni papeleo."],
    [HeartHandshake, "Sin afectar su historial", "No genera deuda ni queda registrado en un buró de crédito."],
  ];
  return (
    <Section id="beneficios">
      <Eyebrow>Beneficios</Eyebrow>
      <H2>Un beneficio que le sirve a los dos lados</H2>
      <div className="av-grid-2" style={{ marginTop: 28 }}>
        <div>
          <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 14, color: C.gold, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>Para la empresa</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {empresa.map(([Icon, title, desc], i) => (
              <Card key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 18 }}>
                <Icon size={18} color={C.gold} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 14.5, color: C.ink }}>{title}</div>
                  <div style={{ fontFamily: BODY, fontSize: 13, color: C.inkDim, marginTop: 2 }}>{desc}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 14, color: C.teal, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>Para los colaboradores</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {colaborador.map(([Icon, title, desc], i) => (
              <Card key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 18 }}>
                <Icon size={18} color={C.teal} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 14.5, color: C.ink }}>{title}</div>
                  <div style={{ fontFamily: BODY, fontSize: 13, color: C.inkDim, marginTop: 2 }}>{desc}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

const WHATSAPP_NUMBER = "18495871799";
function waLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function Planes() {
  const plans = [
    {
      name: "Plan Básico", price: "Gratis", note: "para toda empresa afiliada",
      features: ["Implementación sin costo", "Dashboard estándar", "Fondo revolvente propio de Vanza", "Soporte por correo"],
      cta: "Empezar gratis", highlight: false,
      wa: waLink("Hola, quiero afiliar mi empresa al Plan Básico de Vanza (sin costo). ¿Cómo empezamos?"),
    },
    {
      name: "Plan Empresarial", price: "RD$50–80", note: "por empleado activo/mes",
      features: ["Todo lo del Plan Básico", "La empresa subsidia la tarifa del empleado", "Beneficio laboral 100% visible", "Reportes de adopción"],
      cta: "Solicitar propuesta", highlight: true,
      wa: waLink("Hola, quiero solicitar una propuesta para el Plan Empresarial de Vanza (iguala por empleado) para mi empresa."),
    },
    {
      name: "Plan Corporativo", price: "RD$8,000–15,000", note: "mensual, según tamaño",
      features: ["Todo lo del Plan Básico", "Analítica avanzada", "Soporte prioritario", "Integración personalizada"],
      cta: "Hablar con ventas", highlight: false,
      wa: waLink("Hola, quiero hablar con ventas sobre el Plan Corporativo de Vanza para mi empresa."),
    },
  ];
  return (
    <Section id="planes" style={{ background: C.bgAlt, borderRadius: 28 }}>
      <Eyebrow color={C.teal}>Planes de membresía</Eyebrow>
      <H2>El plan básico siempre es gratis. Los extras son opcionales.</H2>
      <div className="av-plans" style={{ marginTop: 28 }}>
        {plans.map((p) => (
          <Card key={p.name} style={{ border: p.highlight ? `2px solid ${C.gold}` : `1px solid ${C.cardBorder}`, position: "relative", background: C.card }}>
            {p.highlight && (
              <div style={{ position: "absolute", top: -12, left: 24, background: C.gold, color: "#2B1B0F", fontFamily: BODY, fontWeight: 700, fontSize: 11, padding: "3px 10px", borderRadius: 999 }}>MÁS ELEGIDO</div>
            )}
            <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 15, color: C.inkDim, marginBottom: 6 }}>{p.name}</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 27, color: C.ink, fontWeight: 700 }}>{p.price}</div>
            <div style={{ fontFamily: BODY, fontSize: 12.5, color: C.inkFaint, marginBottom: 18 }}>{p.note}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
              {p.features.map((f) => (
                <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Check size={15} color={C.teal} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontFamily: BODY, fontSize: 13.5, color: C.inkDim }}>{f}</span>
                </div>
              ))}
            </div>
            {p.highlight ? <PrimaryButton href={p.wa} style={{ width: "100%", justifyContent: "center" }}>{p.cta}</PrimaryButton>
              : <GhostButton href={p.wa} style={{ width: "100%", justifyContent: "center" }}>{p.cta}</GhostButton>}
          </Card>
        ))}
      </div>
    </Section>
  );
}

function FaqItem({ q, a, open, onToggle }) {
  return (
    <div style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
      <button onClick={onToggle} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "18px 0", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}>
        <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 15.5, color: C.ink }}>{q}</span>
        <ChevronDown size={18} color={C.inkFaint} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0, marginLeft: 12 }} />
      </button>
      {open && <p style={{ fontFamily: BODY, fontSize: 14, color: C.inkDim, lineHeight: 1.6, margin: "0 0 20px" }}>{a}</p>}
    </div>
  );
}

function Faq() {
  const faqs = [
    ["¿Esto es un préstamo?", "No. El empleado accede a una porción del salario que ya ganó, no a dinero prestado. No genera intereses ni afecta su historial crediticio."],
    ["¿Nuestra empresa adelanta dinero?", "No. El capital para los adelantos lo pone Vanza a través de su fondo revolvente propio. Tu empresa nunca desembolsa recursos."],
    ["¿Qué pasa si un empleado se va antes de que se recupere un adelanto?", "El monto se descuenta con prioridad de su liquidación final. Si no alcanza, la diferencia es responsabilidad de Vanza frente al empleado, no de tu empresa."],
    ["¿Cuánto tarda la implementación?", "La integración con tu sistema de nómina toma días, no meses — es una conexión estándar vía API o archivo cifrado, sin desarrollo a medida."],
    ["¿Qué necesita hacer nuestro equipo de RRHH?", "Prácticamente nada de forma manual: el descuento se automatiza en la nómina siguiente. Solo revisas los reportes cuando quieras."],
  ];
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <Section id="faq" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <Eyebrow color={C.teal}>Preguntas frecuentes</Eyebrow>
        <H2>Resolvemos tus dudas</H2>
      </div>
      <div style={{ marginTop: 20 }}>
        {faqs.map((f, i) => (
          <FaqItem key={i} q={f[0]} a={f[1]} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} />
        ))}
      </div>
    </Section>
  );
}

function Contacto() {
  const [form, setForm] = useState({ nombre: "", empresa: "", email: "", telefono: "", tamano: "", mensaje: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    setBusy(true);
    // Best-effort background save — never blocks the user-facing action below.
    api.saveLead(form).catch(() => {});
    const msg =
      `Hola, quiero solicitar una propuesta para mi empresa.\n\n` +
      `Nombre: ${form.nombre}\n` +
      `Empresa: ${form.empresa}\n` +
      `Correo: ${form.email}\n` +
      (form.telefono ? `Teléfono: ${form.telefono}\n` : "") +
      (form.tamano ? `Cantidad de empleados: ${form.tamano}\n` : "") +
      (form.mensaje ? `Mensaje: ${form.mensaje}` : "");
    window.open(waLink(msg), "_blank");
    setBusy(false);
    setSent(true);
  };
  return (
    <Section id="contacto" style={{ background: C.bgAlt, borderRadius: 28 }}>
      <div className="av-contact-grid">
        <div>
          <Eyebrow>Contacto</Eyebrow>
          <H2>Solicita una propuesta para tu empresa</H2>
          <p style={{ fontFamily: BODY, fontSize: 15, color: C.inkDim, lineHeight: 1.6, marginBottom: 26 }}>
            Cuéntanos sobre tu empresa y te armamos una propuesta a la medida — tamaño de plantilla, sector y qué plan tiene más sentido para ustedes.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <a href={waLink("Hola, quisiera más información sobre Vanza.")} target="_blank" rel="noopener noreferrer" style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none" }}><MessagesSquare size={16} color={C.gold} /><span style={{ fontFamily: BODY, fontSize: 14, color: C.inkDim }}>WhatsApp: +1 (849) 587-1799</span></a>
            <a href="tel:+18495871799" style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none" }}><Phone size={16} color={C.gold} /><span style={{ fontFamily: BODY, fontSize: 14, color: C.inkDim }}>Teléfono: +1 (849) 587-1799</span></a>
            <a href="mailto:ventas@vanza.com.do" style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none" }}><Mail size={16} color={C.gold} /><span style={{ fontFamily: BODY, fontSize: 14, color: C.inkDim }}>ventas@vanza.com.do</span></a>
          </div>
        </div>
        <Card>
          {sent ? (
            <div style={{ textAlign: "center", padding: "30px 10px" }}>
              <Check size={30} color={C.teal} style={{ marginBottom: 12 }} />
              <div style={{ fontFamily: DISPLAY, fontSize: 20, color: C.ink, marginBottom: 8 }}>¡Listo!</div>
              <p style={{ fontFamily: BODY, fontSize: 14, color: C.inkDim }}>Recibimos tu solicitud. Te contactaremos en menos de 24 horas con una propuesta a la medida.</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <Field label="Nombre" required value={form.nombre} onChange={update("nombre")} />
              <Field label="Empresa" required value={form.empresa} onChange={update("empresa")} />
              <Field label="Correo electrónico" type="email" required value={form.email} onChange={update("email")} />
              <Field label="Teléfono" value={form.telefono} onChange={update("telefono")} />
              <Field label="Cantidad de empleados" value={form.tamano} onChange={update("tamano")} placeholder="ej. 150" />
              <label style={{ display: "block", marginBottom: 18 }}>
                <span style={{ fontFamily: BODY, fontSize: 12.5, color: C.inkDim, fontWeight: 600 }}>Mensaje (opcional)</span>
                <textarea rows={3} value={form.mensaje} onChange={update("mensaje")} style={{ width: "100%", marginTop: 6, padding: "11px 13px", borderRadius: 9, border: `1px solid ${C.cardBorder}`, background: C.bgAlt, color: C.ink, fontFamily: BODY, fontSize: 14.5, outline: "none", boxSizing: "border-box", resize: "vertical" }} />
              </label>
              <PrimaryButton type="button" onClick={submit} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>{busy ? "Enviando..." : "Solicitar propuesta"}</PrimaryButton>
            </form>
          )}
        </Card>
      </div>
    </Section>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 14 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map((l) => {
          const label = typeof l === "string" ? l : l.label;
          const href = typeof l === "string" ? null : l.href;
          const style = { fontFamily: BODY, fontSize: 13, color: C.inkFaint, textDecoration: "none" };
          return href
            ? <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={style}>{label}</a>
            : <span key={label} style={style}>{label}</span>;
        })}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ padding: "48px 24px 28px", borderTop: `1px solid ${C.cardBorder}` }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div className="av-footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Wallet size={15} color="#2B1B0F" strokeWidth={2.4} />
              </div>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, color: C.ink }}>Vanza</span>
            </div>
            <p style={{ fontFamily: BODY, fontSize: 13, color: C.inkFaint, maxWidth: 280, lineHeight: 1.6 }}>
              Plataforma de salario bajo demanda para empresas dominicanas. Un beneficio real, sin riesgo de flujo de caja.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <a href={waLink("Hola, quisiera más información sobre Vanza.")} target="_blank" rel="noopener noreferrer" style={{ color: C.inkFaint, display: "flex" }} aria-label="Escribir por WhatsApp">
                <Globe size={17} />
              </a>
              <a href="mailto:ventas@vanza.com.do" style={{ color: C.inkFaint, display: "flex" }} aria-label="Enviar correo">
                <AtSign size={17} />
              </a>
              <a href={waLink("Hola, quisiera más información sobre Vanza.")} target="_blank" rel="noopener noreferrer" style={{ color: C.inkFaint, display: "flex" }} aria-label="Compartir por WhatsApp">
                <Share2 size={17} />
              </a>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 14 }}>Nosotros</div>
            <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 11, color: C.gold, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>Misión</div>
            <p style={{ fontFamily: BODY, fontSize: 12.5, color: C.inkFaint, lineHeight: 1.5, margin: "0 0 14px" }}>
              Darle a cada colaborador dominicano acceso justo y transparente al salario que ya devengó, como alternativa real al préstamo informal.
            </p>
            <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 11, color: C.teal, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>Visión</div>
            <p style={{ fontFamily: BODY, fontSize: 12.5, color: C.inkFaint, lineHeight: 1.5, margin: 0 }}>
              Ser la plataforma de bienestar financiero laboral líder en República Dominicana.
            </p>
          </div>
          <FooterCol title="Contacto" links={[
            { label: "ventas@vanza.com.do", href: "mailto:ventas@vanza.com.do" },
            { label: "+1 (849) 587-1799", href: waLink("Hola, quisiera más información sobre Vanza.") },
            "Santo Domingo, RD",
          ]} />
          <FooterCol title="Legal" links={["Política de privacidad", "Términos y condiciones"]} />
        </div>
        <div style={{ borderTop: `1px solid ${C.cardBorder}`, marginTop: 32, paddingTop: 20, textAlign: "center" }}>
          <p style={{ fontFamily: BODY, fontSize: 12, color: C.inkFaint }}>© {new Date().getFullYear()} Vanza — República Dominicana</p>
        </div>
      </div>
    </footer>
  );
}

function MarketingWebsite({ onLogin }) {
  return (
    <div>
      <Nav onLogin={onLogin} />
      <Inicio />
      <ElProblema />
      <NuestraSolucion />
      <ComoFunciona />
      <Beneficios />
      <Planes />
      <Faq />
      <Contacto />
      <Footer />
    </div>
  );
}

/* =======================================================================
   PART 2 — THE APP (behind "Iniciar sesión")
======================================================================= */
function AccessPortal({ onPick, onBackToSite }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <button onClick={onBackToSite} style={{ position: "absolute", top: 20, left: 20, background: "none", border: "none", color: C.inkFaint, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: BODY, fontSize: 13.5 }}>
        <ArrowLeft size={15} /> Volver al sitio
      </button>
      <Logo size={30} />
      <h1 style={{ fontFamily: DISPLAY, fontSize: "clamp(28px, 5vw, 42px)", color: C.ink, fontWeight: 600, margin: "28px 0 10px", maxWidth: 520, lineHeight: 1.15 }}>
        Tu salario, disponible antes de la quincena.
      </h1>
      <p style={{ fontFamily: BODY, color: C.inkDim, fontSize: 15.5, maxWidth: 440, marginBottom: 40 }}>
        Sin intereses. Sin préstamos. Solo el dinero que ya ganaste.
      </p>
      <div className="av-cards">
        <button onClick={() => onPick("employee")} style={cardButtonStyle} onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.gold)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.cardBorder)}>
          <User size={26} color={C.gold} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: BODY, fontWeight: 700, color: C.ink, fontSize: 15.5 }}>Soy Empleado</div>
            <div style={{ fontFamily: BODY, color: C.inkFaint, fontSize: 12.5 }}>Ver mi salario y pedir un adelanto</div>
          </div>
        </button>
        <button onClick={() => onPick("company")} style={cardButtonStyle} onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.teal)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.cardBorder)}>
          <Building2 size={26} color={C.teal} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: BODY, fontWeight: 700, color: C.ink, fontSize: 15.5 }}>Soy Empresa</div>
            <div style={{ fontFamily: BODY, color: C.inkFaint, fontSize: 12.5 }}>Gestionar mis colaboradores</div>
          </div>
        </button>
      </div>
    </div>
  );
}
const cardButtonStyle = {
  display: "flex", alignItems: "center", gap: 14, background: C.card,
  border: `1.5px solid ${C.cardBorder}`, borderRadius: 16, padding: "18px 22px",
  cursor: "pointer", width: 260, transition: "border-color 0.15s ease",
};

function AuthShell({ children, onBack, icon, title, accent }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.inkFaint, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 22, fontFamily: BODY, fontSize: 13.5 }}>
          <ArrowLeft size={15} /> Volver
        </button>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.bgAlt, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${accent}44` }}>{icon}</div>
            <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 19, color: C.ink }}>{title}</span>
          </div>
          {children}
        </Card>
      </div>
    </div>
  );
}

function EmployeeLogin({ onBack, onLogin }) {
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const session = await api.loginEmployee(cedula.trim(), password);
      if (!session) { setError("Cédula o contraseña incorrecta."); setBusy(false); return; }
      onLogin(session);
    } catch (err) {
      setError((err && err.message) || "No se pudo iniciar sesión.");
      setBusy(false);
    }
  };
  return (
    <AuthShell onBack={onBack} accent={C.gold} icon={<User size={20} color={C.gold} />} title="Acceso Empleado">
      <form onSubmit={submit}>
        <Field label="Cédula" placeholder="402-1234567-8" value={cedula} onChange={(e) => setCedula(e.target.value)} />
        <Field label="Contraseña" type="password" placeholder="••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorNote>{error}</ErrorNote>
        <Button type="button" onClick={submit} disabled={busy} style={{ width: "100%" }}>
          {busy ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />} Iniciar sesión
        </Button>
      </form>
      <p style={{ fontFamily: BODY, fontSize: 12, color: C.inkFaint, marginTop: 18, textAlign: "center" }}>Usa la cédula y contraseña que te dio tu empresa (o la que se generó al importar la nómina).</p>
    </AuthShell>
  );
}

function CompanyLogin({ onBack, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const session = await api.loginCompany(username.trim(), password);
      if (!session) { setError("Usuario o contraseña incorrecta."); setBusy(false); return; }
      onLogin(session);
    } catch (err) {
      setError((err && err.message) || "No se pudo iniciar sesión.");
      setBusy(false);
    }
  };
  return (
    <AuthShell onBack={onBack} accent={C.teal} icon={<Building2 size={20} color={C.teal} />} title="Acceso Empresa">
      <form onSubmit={submit}>
        <Field label="Usuario" placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Field label="Contraseña" type="password" placeholder="••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorNote>{error}</ErrorNote>
        <Button variant="teal" type="button" onClick={submit} disabled={busy} style={{ width: "100%" }}>
          {busy ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />} Iniciar sesión
        </Button>
      </form>
    </AuthShell>
  );
}

// No conectado a ninguna ruta hoy (herramienta interna de una sola empresa),
// pero se deja disponible por si en el futuro se habilita alta de empresas.
function CompanyRegister({ onBack, onRegistered }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password) { setError("Completa todos los campos."); return; }
    setBusy(true);
    setError("");
    try {
      const session = await api.registerCompany(name.trim(), username.trim(), password);
      onRegistered(session);
    } catch (err) {
      const msg = err && err.message === "username_taken" ? "Ese usuario ya existe." : (err && err.message) || "No se pudo crear la cuenta.";
      setError(msg);
    }
    setBusy(false);
  };
  return (
    <AuthShell onBack={onBack} accent={C.teal} icon={<Building2 size={20} color={C.teal} />} title="Registrar Empresa">
      <form onSubmit={submit}>
        <Field label="Nombre de la empresa" placeholder="Mi Empresa SRL" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Usuario" placeholder="miempresa" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Field label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorNote>{error}</ErrorNote>
        <Button variant="teal" type="button" onClick={submit} disabled={busy} style={{ width: "100%" }}>
          {busy ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} Crear cuenta
        </Button>
      </form>
    </AuthShell>
  );
}

function TopBar({ title, subtitle, onLogout }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 980, margin: "0 auto" }}>
      <Logo size={19} />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 14, color: C.ink }}>{title}</div>
          <div style={{ fontFamily: BODY, fontSize: 11.5, color: C.inkFaint }}>{subtitle}</div>
        </div>
        <button onClick={onLogout} style={{ background: "none", border: `1px solid ${C.cardBorder}`, borderRadius: 9, padding: 9, color: C.inkDim, cursor: "pointer", display: "flex" }}>
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

function Skel({ w, h = 14, style }) {
  return <div className="av-skeleton" style={{ width: w, height: h, ...style }} />;
}
function DashboardSkeleton() {
  return (
    <div>
      <div className="av-stats-grid" style={{ marginBottom: 22 }}>
        {[0, 1, 2].map((i) => (
          <Card key={i} hoverable={false} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skel w={18} h={18} style={{ borderRadius: 6 }} />
            <Skel w={70} h={22} />
            <Skel w={110} h={11} />
          </Card>
        ))}
      </div>
      <Card hoverable={false}>
        <Skel w={160} h={18} style={{ marginBottom: 18 }} />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: `1px solid ${C.cardBorder}` }}>
            <Skel w="100%" h={14} style={{ flex: 1.4 }} />
            <Skel w="100%" h={14} style={{ flex: 1 }} />
            <Skel w="100%" h={14} style={{ flex: 0.8 }} />
            <Skel w="100%" h={14} style={{ flex: 1 }} />
          </div>
        ))}
      </Card>
    </div>
  );
}
function StatCard({ icon, label, value }) {
  const isNumeric = typeof value === "number";
  const [countRef, animated] = useCountUp(isNumeric ? value : 0);
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {icon}
      <span ref={isNumeric ? countRef : null} className={isNumeric ? undefined : "av-fade-scale"} style={{ fontFamily: MONO, fontSize: 22, color: C.ink, fontWeight: 600 }}>
        {isNumeric ? animated.toLocaleString("es-DO") : value}
      </span>
      <span style={{ fontFamily: BODY, fontSize: 12, color: C.inkFaint }}>{label}</span>
    </Card>
  );
}
function Row({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ color: C.inkDim }}>{label}</span>
      <span style={{ color: bold ? C.gold : C.ink, fontWeight: bold ? 700 : 500, fontFamily: MONO }}>{value}</span>
    </div>
  );
}
function StatusPill({ status }) {
  const cfg = {
    pendiente: { bg: "#4A3418", fg: C.goldSoft, border: C.gold, icon: Clock3, label: "Pendiente" },
    transferido: { bg: "#1E3350", fg: "#9FC4F0", border: "#4E86C7", icon: Wallet, label: "Transferido" },
    recuperado: { bg: "#1E3B36", fg: C.tealSoft, border: C.teal, icon: CheckCircle2, label: "Recuperado" },
  };
  const s = cfg[status] || cfg.pendiente;
  const Icon = s.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: BODY, fontSize: 13, fontWeight: 800, padding: "6px 13px", borderRadius: 999, background: s.bg, color: s.fg, border: `1.5px solid ${s.border}` }}>
      <Icon size={14} />
      {s.label}
    </span>
  );
}
function TableHead({ cols, five }) {
  return (
    <div className={five ? "av-table-head av-table-head-5" : "av-table-head"} style={{ padding: "0 0 8px", borderBottom: `1px solid ${C.cardBorder}` }}>
      {cols.map((c, i) => (
        <span key={i} style={{ fontFamily: BODY, fontSize: 11, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>{c}</span>
      ))}
    </div>
  );
}
const cellStyle = { fontFamily: BODY, fontSize: 13.5, color: C.ink };

function EmployeeDashboard({ employee, token, onLogout }) {
  const cycleDay = currentCycleDay();
  const dailyRate = employee.monthlySalary / 30;
  const devengado = Math.round(dailyRate * cycleDay);
  const maxAdvance = Math.round((devengado * 0.5) / 50) * 50;

  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myAdvances, setMyAdvances] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.getEmployeeAdvances(token)
      .then((list) => { if (!cancelled) setMyAdvances(list); })
      .catch((e) => { if (!cancelled) setError((e && e.message) || "No se pudo cargar tu historial."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const numAmount = Number(amount) || 0;
  const fee = numAmount > 0 ? computeFee(numAmount) : 0;
  const cuotas = numAmount > 0 ? computeCuotas(numAmount) : 0;
  const neto = numAmount > 0 ? numAmount - fee : 0;

  const request = async () => {
    setError(""); setSuccess("");
    if (!numAmount || numAmount <= 0) { setError("Ingresa un monto válido."); return; }
    if (numAmount > maxAdvance) { setError(`El máximo disponible es ${fmt(maxAdvance)}.`); return; }
    setBusy(true);
    try {
      const list = await api.requestAdvance(token, numAmount, fee, cuotas, "Transferido a cuenta nominal");
      setMyAdvances(list);
      setAmount("");
      setSuccess(`Solicitud enviada. Recibirás ${fmt(neto)} y se descontará en ${cuotas} nómina${cuotas > 1 ? "s" : ""}.`);
    } catch (err) {
      setError((err && err.message) || "No se pudo registrar la solicitud. Intenta de nuevo en unos segundos.");
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", padding: "20px 20px 60px" }}>
      <TopBar title={employee.name} subtitle="Empleado" onLogout={onLogout} />
      <div className="av-dash-grid" style={{ maxWidth: 880, margin: "28px auto 0" }}>
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
          <span style={{ fontFamily: BODY, fontSize: 12.5, color: C.inkDim, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>Ciclo actual</span>
          <PaydayRing day={cycleDay - 1} />
          <div>
            <div style={{ fontFamily: MONO, fontSize: 24, color: C.gold, fontWeight: 600 }}>{fmt(devengado)}</div>
            <div style={{ fontFamily: BODY, fontSize: 12.5, color: C.inkFaint }}>devengado hasta hoy</div>
          </div>
          <div style={{ width: "100%", height: 1, background: C.cardBorder }} />
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: BODY, fontSize: 13, color: C.inkDim }}>Salario mensual</span>
            <span style={{ fontFamily: MONO, fontSize: 13, color: C.ink }}>{fmt(employee.monthlySalary)}</span>
          </div>
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: BODY, fontSize: 13, color: C.inkDim }}>Disponible (50%)</span>
            <span style={{ fontFamily: MONO, fontSize: 13, color: C.teal, fontWeight: 700 }}>{fmt(maxAdvance)}</span>
          </div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <h3 style={{ fontFamily: DISPLAY, color: C.ink, fontSize: 18, margin: "0 0 16px" }}>Solicitar un adelanto</h3>
            <Field label={`Monto a retirar (máx. ${fmt(maxAdvance)})`} type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: BODY, fontSize: 12.5, color: C.inkDim, fontWeight: 600, letterSpacing: 0.3 }}>Transferido a cuenta nominal</span>
              <p style={{ fontFamily: BODY, fontSize: 11.5, color: C.inkFaint, margin: "4px 0 0" }}>Aquí estará su comprobante una vez esté completado.</p>
            </div>
            {numAmount > 0 && (
              <div style={{ background: C.bgAlt, borderRadius: 10, padding: 14, marginBottom: 16, fontFamily: BODY, fontSize: 13.5 }}>
                <Row label="Tarifa fija del servicio" value={fmt(fee)} />
                <Row label="Recuperación en" value={`${cuotas} nómina${cuotas > 1 ? "s" : ""}`} />
                <Row label="Recibirás" value={fmt(neto)} bold />
              </div>
            )}
            <ErrorNote>{error}</ErrorNote>
            {success && <div style={{ display: "flex", gap: 8, color: C.teal, fontFamily: BODY, fontSize: 13.5, marginBottom: 14 }}><CheckCircle2 size={15} /> {success}</div>}
            <Button onClick={request} disabled={busy || !numAmount} style={{ width: "100%" }}>
              {busy ? <Loader2 size={16} className="spin" /> : <Wallet size={16} />} Solicitar adelanto
            </Button>
          </Card>
          <Card>
            <h3 style={{ fontFamily: DISPLAY, color: C.ink, fontSize: 18, margin: "0 0 14px" }}>Historial</h3>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[0, 1].map((i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
                    <Skel w={90} h={16} /><Skel w={70} h={22} style={{ borderRadius: 999 }} />
                  </div>
                ))}
              </div>
            ) : myAdvances.length === 0 ? <EmptyNote>Aún no has solicitado ningún adelanto.</EmptyNote> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myAdvances.map((a) => (
                  <div key={a.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.cardBorder}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontFamily: MONO, fontSize: 14.5, color: C.ink }}>{fmt(a.amount)}</div>
                        <div style={{ fontFamily: BODY, fontSize: 11.5, color: C.inkFaint }}>{new Date(a.requestedAt).toLocaleDateString("es-DO")} · {a.cuotas} cuota{a.cuotas > 1 ? "s" : ""}{a.cuentaBanco ? ` · ${a.cuentaBanco}` : ""}</div>
                      </div>
                      <StatusPill status={a.status} />
                    </div>
                    {a.comprobante ? (
                      <a href={a.comprobante} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginTop: 8 }}>
                        <img src={a.comprobante} alt="Comprobante" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.cardBorder}` }} />
                        <span style={{ fontFamily: BODY, fontSize: 12, color: C.tealSoft }}>Ver comprobante</span>
                      </a>
                    ) : (
                      <p style={{ fontFamily: BODY, fontSize: 11.5, color: C.inkFaint, fontStyle: "italic", margin: "8px 0 0" }}>
                        Aquí estará su comprobante una vez esté completado.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function AddEmployeeModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [cedula, setCedula] = useState("");
  const [salary, setSalary] = useState("");
  const [error, setError] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !cedula.trim() || !salary) { setError("Completa todos los campos."); return; }
    onSubmit({ name: name.trim(), cedula: cedula.trim(), salary });
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ fontFamily: DISPLAY, color: C.ink, fontSize: 18, margin: 0 }}>Agregar colaborador</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", color: C.inkFaint, cursor: "pointer" }}><X size={18} /></button>
          </div>
          <form onSubmit={submit}>
            <Field label="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} />
            <Field label="Cédula" placeholder="000-0000000-0" value={cedula} onChange={(e) => setCedula(e.target.value)} />
            <Field label="Salario mensual (RD$)" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} />
            <ErrorNote>{error}</ErrorNote>
            <Button type="button" onClick={submit} style={{ width: "100%" }}><CheckCircle2 size={16} /> Guardar</Button>
          </form>
          <p style={{ fontFamily: BODY, fontSize: 11.5, color: C.inkFaint, marginTop: 12, textAlign: "center" }}>Contraseña inicial: 1234 (usuario = cédula)</p>
        </Card>
      </div>
    </div>
  );
}

/* =======================================================================
   NÓMINA — import mapping + upsert logic
   Diseñado para que en el futuro el origen de las filas (hoy: un Excel/CSV
   parseado en el navegador) pueda ser reemplazado por una respuesta de API
   de un sistema de nómina externo, sin tocar la lógica de guardado/upsert
   de abajo — solo hay que cambiar quién produce el array `rows`.
------------------------------------------------------------------- */
function normalizeKey(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Compara cédulas ignorando ceros a la izquierda, espacios, guiones y
// diferencias de formato (texto vs número) — un archivo de nómina distinto,
// o Excel recortando ceros, no debe crear una cuenta duplicada ni impedir
// que se actualice la cuenta existente de un empleado.
function normalizeCedula(c) {
  return String(c == null ? "" : c).replace(/\D/g, "").replace(/^0+/, "");
}

// Solo estos son los campos que la interfaz muestra. Cualquier otra columna
// del Excel (vacaciones, AFP, ISR, SFS, comisiones, etc.) se guarda en
// `extra` para uso futuro, pero nunca se mapea a estas columnas visibles.
const PAYROLL_FIELD_ALIASES = {
  nombre: ["nombre", "nombres", "empleado", "nombrecompleto"],
  apellidos: ["apellidos", "apellido"],
  apellidoPrimero: ["primerapellido", "1erapellido"],
  apellidoSegundo: ["segundoapellido", "2doapellido"],
  cedula: ["cedula", "documento", "documentodeidentidad", "id"],
  departamento: ["departamento", "depto", "area"],
  cargo: ["cargo", "puesto", "posicion"],
  salarioNeto: ["salarioneto", "salarioquincenal", "netoquincenal"],
  salarioMensual: ["salario", "sueldo", "salariomensual"],
  estado: ["estado"],
  // Nota: "Próx. Pago" ya NO se lee del Excel — siempre se calcula
  // automáticamente con la fecha del sistema (ver nextQuincenaDate más abajo),
  // mientras el empleado no tenga un avance activo que lo cambie.
};

// Calcula la fecha de la próxima quincena a partir de hoy:
// día 1–14 → 15 del mes actual · día 15–(30 o últ. día) → 30 (o últ. día) del
// mes actual · después de eso → 15 del mes siguiente.
const MESES_EN_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function nextQuincenaDate(baseDate) {
  const day = baseDate.getDate();
  const month = baseDate.getMonth();
  const year = baseDate.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const payDay2 = Math.min(30, daysInMonth);
  if (day <= 14) return new Date(year, month, 15);
  if (day <= payDay2) return new Date(year, month, payDay2);
  return new Date(year, month + 1, 15);
}
function formatProximoPago(date) {
  return `${MESES_EN_ABBR[date.getMonth()]}, ${date.getDate()}`;
}
// Por ahora es la misma fecha para todos (mientras no exista lógica de
// avances que la personalice por empleado — ver nota del objetivo).
function proximoPagoDisplay() {
  return formatProximoPago(nextQuincenaDate(new Date()));
}

function normalizeEstado(raw) {
  const e = normalizeKey(raw);
  if (["activo", "active", "si", "yes", "1"].includes(e)) return "activo";
  if (["inactivo", "inactive", "no", "0"].includes(e)) return "inactivo";
  return "activo"; // valor no reconocido → tratamos como activo por defecto
}

// Mapea una fila del Excel/CSV a únicamente los 8 campos que usa la app.
// Nombres de columna no reconocidos se preservan en `extra`, sin tocar
// las columnas visibles ni generar errores por columnas faltantes.
// Muchos reportes de nómina reales traen un bloque de título ("NOMINA DE
// PAGOS", "2DA QUINCENA DE...") antes de la fila de encabezados de verdad.
// En vez de asumir que los encabezados están en la fila 1, escaneamos las
// primeras filas y elegimos la que más coincidencias tenga con los alias
// conocidos (DEPTO, CARGO, CEDULA, etc.).
const ALL_PAYROLL_ALIASES = new Set(Object.values(PAYROLL_FIELD_ALIASES).flat());

function parseSheetSmart(sheet) {
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  let headerRowIdx = 0, bestScore = -1;
  const scanLimit = Math.min(raw.length, 25);
  for (let i = 0; i < scanLimit; i++) {
    const row = raw[i] || [];
    let score = 0;
    row.forEach((cell) => { if (ALL_PAYROLL_ALIASES.has(normalizeKey(cell))) score++; });
    if (score > bestScore) { bestScore = score; headerRowIdx = i; }
  }
  const headers = (raw[headerRowIdx] || []).map((h) => String(h == null ? "" : h).trim());
  const dataRows = raw.slice(headerRowIdx + 1).filter((r) => r.some((c) => c !== "" && c != null));
  return dataRows.map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      const v = r[idx];
      obj[h] = v == null ? "" : v;
    });
    return obj;
  });
}

function mapPayrollRow(row) {
  // Índice por nombre de columna normalizado → valor (ignorando vacíos).
  const byNormKey = {};
  for (const [origKey, value] of Object.entries(row)) {
    if (value === "" || value == null) continue;
    const norm = normalizeKey(origKey);
    if (byNormKey[norm] === undefined) byNormKey[norm] = value;
  }

  // Para cada campo, se respeta el orden de sinónimos dado: si el archivo
  // trae una columna "Cédula" explícita Y también una "ID" genérica, gana
  // "Cédula" porque aparece primero en la lista de alias, no la que
  // aparezca primero en el archivo.
  function pick(aliases) {
    for (const alias of aliases) {
      if (byNormKey[alias] !== undefined) return byNormKey[alias];
    }
    return null;
  }

  const buckets = {};
  for (const [field, aliases] of Object.entries(PAYROLL_FIELD_ALIASES)) {
    buckets[field] = pick(aliases);
  }

  const allAliasKeys = new Set(Object.values(PAYROLL_FIELD_ALIASES).flat());
  const extra = {};
  for (const [origKey, value] of Object.entries(row)) {
    if (!allAliasKeys.has(normalizeKey(origKey))) extra[origKey] = value;
  }

  let apellidos = buckets.apellidos != null ? String(buckets.apellidos) : null;
  if (apellidos == null) {
    const p1 = buckets.apellidoPrimero != null ? String(buckets.apellidoPrimero) : "";
    const p2 = buckets.apellidoSegundo != null ? String(buckets.apellidoSegundo) : "";
    const joined = [p1, p2].filter(Boolean).join(" ").trim();
    apellidos = joined || "";
  }

  let salarioNeto = buckets.salarioNeto != null ? Number(buckets.salarioNeto) : null;
  if ((salarioNeto == null || isNaN(salarioNeto)) && buckets.salarioMensual != null) {
    // No vino salario neto/quincenal directo — usamos la lógica de la app:
    // el ciclo de Vanza es quincenal, así que el salario mensual se divide entre 2.
    const mensual = Number(buckets.salarioMensual);
    salarioNeto = !isNaN(mensual) ? mensual / 2 : null;
  }

  return {
    nombre: buckets.nombre != null ? String(buckets.nombre) : "",
    apellidos,
    cedula: buckets.cedula != null ? String(buckets.cedula).trim() : "",
    departamento: buckets.departamento != null ? String(buckets.departamento) : "",
    cargo: buckets.cargo != null ? String(buckets.cargo) : "",
    salarioNeto: salarioNeto != null && !isNaN(salarioNeto) ? salarioNeto : 0,
    estado: buckets.estado != null ? normalizeEstado(buckets.estado) : "activo",
    extra,
  };
}

// Cross-references imported nómina + login employees + pending advances to
// know exactly how much to descontar in the next payroll run for each person.
function getProximaNominaRows(employees, advances) {
  const rows = [];
  employees.forEach((emp) => {
    // Solo se descuentan de nómina los adelantos ya transferidos al empleado
    // — uno "pendiente" todavía no se le ha enviado el dinero, así que no
    // hay nada que recuperar todavía.
    const pendingAdvances = advances.filter((a) => a.employeeId === emp.id && a.status === "transferido");
    pendingAdvances.forEach((a) => {
      const cuotasPagadas = a.cuotasPagadas || 0;
      const total = a.amount + a.fee;
      const perCuota = Math.ceil(total / a.cuotas);
      const pagado = Math.min(perCuota * cuotasPagadas, total);
      const pendiente = total - pagado;
      const descuentoEsta = Math.min(perCuota, pendiente);
      const salarioQuincenal = Math.round((emp.monthlySalary || 0) / 2);
      rows.push({
        advanceId: a.id,
        empleado: emp.name,
        cedula: emp.cedula,
        montoSolicitado: a.amount,
        montoPendiente: pendiente,
        proximaFechaPago: proximoPagoDisplay(),
        descuentoAplicar: descuentoEsta,
        salarioQuincenal,
        restanteDepositar: salarioQuincenal - descuentoEsta,
        cuotasPagadas, cuotasTotal: a.cuotas,
      });
    });
  });
  return rows;
}

function DataTable({ headers, children, empty, maxHeight }) {
  return (
    <div style={{ overflowX: "auto", overflowY: maxHeight ? "auto" : "visible", maxHeight: maxHeight || "none" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${C.cardBorder}`, color: C.inkFaint, fontFamily: BODY, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap", position: "sticky", top: 0, background: C.card, zIndex: 1 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty}
    </div>
  );
}
function Td({ children, color }) {
  return <td style={{ padding: "10px", borderBottom: `1px solid ${C.cardBorder}`, fontFamily: BODY, fontSize: 13.5, color: color || C.ink, whiteSpace: "nowrap" }}>{children}</td>;
}

function NominaImport({ company, token, records, employeeCount, imports, onUpdate }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const [search, setSearch] = useState("");
  const q = normalizeKey(search);
  const filteredRecords = q
    ? records.filter((r) => {
        const nom = normalizeKey(r.nombre);
        const ape = normalizeKey(r.apellidos);
        const full1 = normalizeKey(`${r.nombre} ${r.apellidos}`);
        const full2 = normalizeKey(`${r.apellidos} ${r.nombre}`);
        return nom.includes(q) || ape.includes(q) || full1.includes(q) || full2.includes(q);
      })
    : records;

  const [selectedName, setSelectedName] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [resetErr, setResetErr] = useState("");
  const [resetConfirming, setResetConfirming] = useState(false);

  const doResetPayroll = async () => {
    setResetConfirming(false);
    setResetBusy(true); setResetMsg(""); setResetErr("");
    try {
      const dashboard = await api.resetCompanyPayroll(token);
      onUpdate(dashboard);
      setResetMsg("Nómina reiniciada. Ya puedes subir el Excel de cero.");
    } catch (err) {
      setResetErr(`No se pudo reiniciar la nómina: ${(err && err.message) || err}. Vuelve a intentar en unos segundos.`);
    }
    setResetBusy(false);
  };

  const [accountsMsg, setAccountsMsg] = useState("");
  const [accountsErr, setAccountsErr] = useState("");
  const createAccountsForAll = async () => {
    setAccountsMsg(""); setAccountsErr("");
    setBusy(true);
    try {
      const { dashboard, summary } = await api.createAccountsForPayroll(token);
      onUpdate(dashboard);
      if (summary.creadas === 0 && summary.actualizadas === 0) {
        setAccountsMsg(`Nada que hacer${summary.sinCedula ? ` (${summary.sinCedula} registro(s) sin cédula)` : ""}.`);
      } else {
        setAccountsMsg(`${summary.creadas} cuenta(s) creada(s), ${summary.actualizadas} actualizada(s) (nombre/salario refrescado)${summary.sinCedula ? `, ${summary.sinCedula} sin cédula` : ""}.`);
      }
    } catch (err) {
      setAccountsErr(`No se pudo procesar: ${(err && err.message) || err}. Vuelve a intentar en unos segundos.`);
    }
    setBusy(false);
  };

  const deletePayrollRecord = async (recordId) => {
    try {
      const dashboard = await api.deletePayrollRecord(token, recordId);
      onUpdate(dashboard);
    } catch (err) {
      setError(`No se pudo eliminar: ${(err && err.message) || err}.`);
    }
  };

  const deleteImportEntry = async (importId) => {
    try {
      const dashboard = await api.deletePayrollImport(token, importId);
      onUpdate(dashboard);
    } catch (err) {
      setError(`No se pudo eliminar: ${(err && err.message) || err}.`);
    }
  };

  const readFileAsArrayBuffer = (file) =>
    withTimeout(new Promise((resolve, reject) => {
      // FileReader es la vía más compatible para leer un File en cualquier
      // navegador/entorno; evitamos depender únicamente de file.arrayBuffer().
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo."));
      reader.readAsArrayBuffer(file);
    }), 15000);

  const handleFile = async (e) => {
    setError(""); setMessage("");
    const file = e.target && e.target.files && e.target.files[0];
    if (!file) {
      setError("No se detectó ningún archivo seleccionado. Intenta de nuevo.");
      return;
    }
    setSelectedName(file.name);
    setBusy(true);
    try {
      const buf = await readFileAsArrayBuffer(file);
      const wb = XLSX.read(buf, { type: "array" });
      if (!wb.SheetNames.length) {
        setError("El archivo no tiene ninguna hoja legible.");
      } else {
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawRows = parseSheetSmart(sheet);
        if (!rawRows.length) {
          setError("El archivo se leyó, pero no tiene filas de datos (¿está vacío?).");
        } else {
          const mappedRows = rawRows.map(mapPayrollRow);
          const { dashboard, summary } = await api.importPayroll(token, file.name, mappedRows);
          onUpdate(dashboard);
          const resumen = `${summary.nuevos} nuevo(s), ${summary.actualizados} actualizado(s)`
            + (summary.omitidos ? `, ${summary.omitidos} fila(s) omitida(s) (sin nombre/cédula, probablemente subtotales)` : "")
            + (summary.cuentasCreadas ? `, ${summary.cuentasCreadas} cuenta(s) de acceso creada(s) automáticamente` : "");
          setMessage(`Importación completa: ${resumen}.`);
        }
      }
    } catch (err) {
      // Mostramos el error real (no un mensaje genérico) para poder diagnosticar si vuelve a fallar.
      setError("No se pudo procesar el archivo: " + (err && err.message ? err.message : String(err)));
    }
    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <h3 style={{ fontFamily: DISPLAY, color: C.ink, fontSize: 18, margin: "0 0 8px" }}>Importar Nómina</h3>
        <p style={{ fontFamily: BODY, fontSize: 13.5, color: C.inkDim, lineHeight: 1.5, marginBottom: 16 }}>
          Sube el archivo Excel (.xlsx) o CSV de tu nómina. La cédula es el identificador único: si un empleado ya existe, se actualiza en vez de crear un duplicado. Las columnas que no reconozcamos (AFP, ISR, SFS, comisiones, etc.) se guardan igual internamente, por si las necesitas después.
        </p>
        <input
          ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} disabled={busy}
          style={{ fontFamily: BODY, fontSize: 13.5, color: C.inkDim, marginBottom: 12 }}
        />
        {selectedName && !busy && !message && !error && (
          <div style={{ fontFamily: BODY, fontSize: 12.5, color: C.inkFaint, marginBottom: 8 }}>Archivo detectado: {selectedName}</div>
        )}
        {busy && <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: BODY, fontSize: 13.5, color: C.inkDim }}><Loader2 size={15} className="spin" /> Procesando {selectedName}...</div>}
        {message && <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: BODY, fontSize: 13.5, color: C.teal }}><CheckCircle2 size={15} /> {message}</div>}
        <ErrorNote>{error}</ErrorNote>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <h3 style={{ fontFamily: DISPLAY, color: C.ink, fontSize: 18, margin: 0 }}>Registros de Nómina ({records.length})</h3>
          {records.length > 0 && (
            <Button variant="secondary" onClick={createAccountsForAll} disabled={busy}>
              {busy ? <Loader2 size={15} className="spin" /> : <Users size={15} />} Crear/actualizar cuentas
            </Button>
          )}
        </div>
        {accountsMsg && <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: BODY, fontSize: 13.5, color: C.teal, marginBottom: 12 }}><CheckCircle2 size={15} /> {accountsMsg}</div>}
        <ErrorNote>{accountsErr}</ErrorNote>
        {records.length === 0 ? <EmptyNote>Aún no se ha importado ninguna nómina.</EmptyNote> : (
          <>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o apellidos..."
              style={{
                width: "100%", marginBottom: 14, padding: "10px 13px", borderRadius: 9,
                border: `1px solid ${C.cardBorder}`, background: C.bgAlt, color: C.ink,
                fontFamily: BODY, fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
            />
            {filteredRecords.length === 0 ? (
              <EmptyNote>No se encontraron empleados que coincidan con la búsqueda.</EmptyNote>
            ) : (
              <div style={{ maxHeight: 480, overflowY: "auto", overflowX: "auto", border: `1px solid ${C.cardBorder}`, borderRadius: 10 }}>
                <DataTable headers={["Nombre", "Apellidos", "Cédula", "Departamento", "Cargo", "Salario Neto", "Próx. Pago", "Estado", ""]}>
                  {filteredRecords.map((r) => (
                    <tr key={r.id}>
                      <Td>{r.nombre || "—"}</Td>
                      <Td>{r.apellidos || "—"}</Td>
                      <Td>{r.cedula || "—"}</Td>
                      <Td>{r.departamento || "—"}</Td>
                      <Td>{r.cargo || "—"}</Td>
                      <Td>{r.salarioNeto ? fmt(r.salarioNeto) : "—"}</Td>
                      <Td>{proximoPagoDisplay()}</Td>
                      <Td color={r.estado === "activo" ? C.teal : C.inkFaint}>{r.estado === "activo" ? "Activo" : "Inactivo"}</Td>
                      <Td>
                        <button
                          onClick={() => deletePayrollRecord(r.id)}
                          style={{ background: "none", border: `1px solid ${C.cardBorder}`, color: C.danger, borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: BODY, whiteSpace: "nowrap" }}
                        >
                          Eliminar
                        </button>
                      </Td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            )}
          </>
        )}
      </Card>

      <Card>
        <h3 style={{ fontFamily: DISPLAY, color: C.ink, fontSize: 18, margin: "0 0 14px" }}>Historial de Importaciones</h3>
        {imports.length === 0 ? <EmptyNote>Sin importaciones todavía.</EmptyNote> : (
          <DataTable headers={["Archivo", "Fecha", "Filas", "Nuevos", "Actualizados", "Omitidos", "Cuentas Creadas", ""]}>
            {imports.map((i) => (
              <tr key={i.id}>
                <Td>{i.fileName}</Td>
                <Td>{new Date(i.importedAt).toLocaleString("es-DO")}</Td>
                <Td>{i.rowCount}</Td>
                <Td color={C.teal}>{i.nuevos}</Td>
                <Td color={C.goldSoft}>{i.actualizados}</Td>
                <Td color={C.inkFaint}>{i.omitidos || 0}</Td>
                <Td color={C.tealSoft}>{i.cuentasCreadas || 0}</Td>
                <Td>
                  <button
                    onClick={() => deleteImportEntry(i.id)}
                    style={{ background: "none", border: `1px solid ${C.cardBorder}`, color: C.danger, borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: BODY, whiteSpace: "nowrap" }}
                  >
                    Eliminar
                  </button>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>

      <Card style={{ border: `1px solid ${C.danger}` }}>
        <h3 style={{ fontFamily: DISPLAY, color: C.danger, fontSize: 16, margin: "0 0 8px" }}>Reiniciar nómina completa</h3>
        <p style={{ fontFamily: BODY, fontSize: 13, color: C.inkDim, lineHeight: 1.5, marginBottom: 14 }}>
          Borra todos los registros de nómina, cuentas de empleado, historial de importación y adelantos ligados a esta empresa — para volver a subir el Excel desde cero. Esta acción no se puede deshacer.
        </p>
        {resetMsg && <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: BODY, fontSize: 13.5, color: C.teal, marginBottom: 12 }}><CheckCircle2 size={15} /> {resetMsg}</div>}
        <ErrorNote>{resetErr}</ErrorNote>
        {!resetConfirming ? (
          <Button onClick={() => setResetConfirming(true)} disabled={resetBusy} style={{ background: C.danger, color: "#2B1210" }}>
            <AlertTriangle size={15} /> Reiniciar nómina completa
          </Button>
        ) : (
          <div style={{ background: C.bgAlt, border: `1px solid ${C.danger}`, borderRadius: 10, padding: 16 }}>
            <p style={{ fontFamily: BODY, fontSize: 13.5, color: C.ink, lineHeight: 1.6, margin: "0 0 14px" }}>
              Esto borrará permanentemente para <strong>{company.name}</strong>: {records.length} registro(s) de nómina, {employeeCount} cuenta(s) de empleado, {imports.length} importación(es) y sus adelantos. <strong>No se puede deshacer.</strong> ¿Confirmas?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <Button onClick={doResetPayroll} disabled={resetBusy} style={{ background: C.danger, color: "#2B1210" }}>
                {resetBusy ? <Loader2 size={15} className="spin" /> : <AlertTriangle size={15} />} Sí, borrar todo
              </Button>
              <Button variant="secondary" onClick={() => setResetConfirming(false)} disabled={resetBusy}>Cancelar</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ProximaNomina({ company, token, employees, advances, onUpdate }) {
  const rows = getProximaNominaRows(employees, advances);
  const totalDescuento = rows.reduce((s, r) => s + r.descuentoAplicar, 0);
  const [warning, setWarning] = useState("");

  const marcarCuota = async (advanceId) => {
    try {
      const dashboard = await api.markCuotaPagada(token, advanceId);
      onUpdate(dashboard);
      setWarning("");
    } catch (err) {
      setWarning(`No se pudo aplicar el cambio: ${(err && err.message) || err}. Intenta de nuevo en unos segundos.`);
    }
  };

  const exportExcel = () => {
    const data = rows.map((r) => ({
      "Empleado": r.empleado,
      "Cédula": r.cedula || "",
      "Salario Neto Quincenal": r.salarioQuincenal,
      "Monto Solicitado": r.montoSolicitado,
      "Monto Pendiente": r.montoPendiente,
      "Próxima Fecha de Pago": r.proximaFechaPago,
      "Descuento a Aplicar": r.descuentoAplicar,
      "Restante a Depositar": r.restanteDepositar,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Proxima Nomina");
    const safeName = company.name.replace(/[^a-zA-Z0-9]+/g, "_");
    XLSX.writeFile(wb, `proxima_nomina_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totalDepositar = rows.reduce((s, r) => s + r.restanteDepositar, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="av-stats-grid">
        <StatCard icon={<Users size={18} color={C.gold} />} label="Empleados con descuento" value={rows.length} />
        <StatCard icon={<Wallet size={18} color={C.tealSoft} />} label="Total a descontar" value={fmt(totalDescuento)} />
        <StatCard icon={<CheckCircle2 size={18} color={C.teal} />} label="Total a depositar (restante)" value={fmt(totalDepositar)} />
      </div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: DISPLAY, color: C.ink, fontSize: 18, margin: 0 }}>Próxima Nómina</h3>
          <Button variant="secondary" onClick={exportExcel} disabled={rows.length === 0}><FileCheck size={15} /> Exportar Excel</Button>
        </div>
        <ErrorNote>{warning}</ErrorNote>
        {rows.length === 0 ? <EmptyNote>No hay adelantos pendientes por descontar en la próxima nómina.</EmptyNote> : (
          <DataTable headers={["Empleado", "Salario Quincenal", "Descuento a Aplicar", "Restante a Depositar", "Próx. Fecha de Pago", "Cuota", ""]}>
            {rows.map((r) => (
              <tr key={r.advanceId}>
                <Td>{r.empleado}</Td>
                <Td>{fmt(r.salarioQuincenal)}</Td>
                <Td color={C.gold}>{fmt(r.descuentoAplicar)}</Td>
                <Td color={C.teal}>{fmt(r.restanteDepositar)}</Td>
                <Td color={r.proximaFechaPago === "Sin nómina importada" ? C.inkFaint : C.ink}>{r.proximaFechaPago}</Td>
                <Td>{r.cuotasPagadas}/{r.cuotasTotal}</Td>
                <Td>
                  <button onClick={() => marcarCuota(r.advanceId)} style={{ background: "none", border: `1px solid ${C.cardBorder}`, color: C.tealSoft, borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: BODY, whiteSpace: "nowrap" }}>
                    Marcar cuota descontada
                  </button>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}


function CompanyDashboard({ company, token, onLogout }) {
  const cycleDay = currentCycleDay();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [payrollImports, setPayrollImports] = useState([]);

  const applyDashboard = (dashboard) => {
    setEmployees(dashboard.employees);
    setAdvances(dashboard.advances);
    setPayrollRecords(dashboard.payrollRecords);
    setPayrollImports(dashboard.payrollImports);
  };

  useEffect(() => {
    let cancelled = false;
    api.getCompanyDashboard(token)
      .then((dashboard) => { if (!cancelled) applyDashboard(dashboard); })
      .catch((e) => { if (!cancelled) setLoadError((e && e.message) || "No se pudo cargar el panel."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const pending = advances.filter((a) => a.status === "pendiente");
  const totalPending = pending.reduce((s, a) => s + a.amount + a.fee, 0);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState("resumen");
  const [dashWarning, setDashWarning] = useState("");
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);

  const markTransferred = async (id) => {
    try {
      applyDashboard(await api.markAdvanceTransferred(token, id));
      setDashWarning("");
    } catch (err) {
      setDashWarning(`No se pudo aplicar el cambio: ${(err && err.message) || err}. Intenta de nuevo en unos segundos.`);
    }
  };
  const [comprobanteBusyId, setComprobanteBusyId] = useState(null);
  const uploadComprobante = async (id, file) => {
    if (!file) return;
    setComprobanteBusyId(id);
    try {
      const dataUrl = await compressImageFile(file);
      applyDashboard(await api.setAdvanceComprobante(token, id, dataUrl));
      setDashWarning("");
    } catch (e) {
      setDashWarning("No se pudo procesar la foto: " + ((e && e.message) || String(e)));
    }
    setComprobanteBusyId(null);
  };
  const markPaid = async (id) => {
    try {
      applyDashboard(await api.markAdvanceRecovered(token, id));
      setDashWarning("");
    } catch (err) {
      setDashWarning(`No se pudo aplicar el cambio: ${(err && err.message) || err}. Intenta de nuevo en unos segundos.`);
    }
  };
  const addEmployee = async ({ name, cedula, salary }) => {
    try {
      applyDashboard(await api.addEmployee(token, name, cedula, Number(salary)));
      setDashWarning("");
    } catch (err) {
      setDashWarning(`No se pudo agregar el colaborador: ${(err && err.message) || err}.`);
    }
    setShowAdd(false);
  };

  if (loadError) {
    return (
      <div style={{ minHeight: "100vh", padding: "20px 20px 60px" }}>
        <TopBar title={company.name} subtitle="Empresa" onLogout={onLogout} />
        <div style={{ maxWidth: 980, margin: "28px auto 0" }}><ErrorNote>{loadError}</ErrorNote></div>
      </div>
    );
  }
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", padding: "20px 20px 60px" }}>
        <TopBar title={company.name} subtitle="Empresa" onLogout={onLogout} />
        <div style={{ maxWidth: 980, margin: "28px auto 0" }}>
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "20px 20px 60px" }}>
      <TopBar title={company.name} subtitle="Empresa" onLogout={onLogout} />
      <div style={{ maxWidth: 980, margin: "20px auto 0", display: "flex", gap: 22, borderBottom: `1px solid ${C.cardBorder}` }}>
        {[["resumen", "Resumen"], ["nomina", "Nómina"], ["proximaNomina", "Próxima Nómina"]].map(([key, label]) => (
          <button
            key={key} onClick={() => setTab(key)}
            style={{
              background: "none", border: "none", cursor: "pointer", fontFamily: BODY, fontWeight: 600, fontSize: 14,
              padding: "10px 2px", color: tab === key ? C.ink : C.inkFaint,
              borderBottom: tab === key ? `2px solid ${C.gold}` : "2px solid transparent",
              transition: "color 0.2s ease, border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div key={tab} className="av-fade-scale" style={{ maxWidth: 980, margin: "20px auto 0" }}>
        {tab === "resumen" && (
          <>
            <ErrorNote>{dashWarning}</ErrorNote>
            <div className="av-stats-grid" style={{ marginBottom: 22 }}>
              <StatCard icon={<Users size={18} color={C.gold} />} label="Empleados" value={employees.length} />
              <StatCard icon={<Clock3 size={18} color={C.teal} />} label="Adelantos pendientes" value={pending.length} />
              <StatCard icon={<Wallet size={18} color={C.tealSoft} />} label="Por recuperar" value={fmt(totalPending)} />
            </div>
            <Card style={{ marginBottom: 20, border: `2px solid ${C.gold}`, background: `linear-gradient(180deg, ${C.card}, ${C.bgAlt})` }}>
              <h3 style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 21, margin: "0 0 18px", display: "flex", alignItems: "center", gap: 9 }}>
                <Wallet size={20} color={C.gold} /> Adelantos
              </h3>
              {advances.length === 0 ? <EmptyNote>Sin adelantos registrados todavía.</EmptyNote> : (
                <>
                  <TableHead cols={["Empleado", "Monto", "Cuotas", "Estado", ""]} five />
                  {advances.sort((a, b) => b.requestedAt - a.requestedAt).map((a) => {
                    const emp = employees.find((e) => e.id === a.employeeId);
                    return (
                      <div key={a.id} style={{ padding: "16px 0", borderBottom: `1px solid ${C.cardBorder}` }}>
                        <div className="av-table-row av-table-row-5" style={{ alignItems: "center" }}>
                          <span style={{ ...cellStyle, fontSize: 15, fontWeight: 600 }}>{emp ? emp.name : "—"}</span>
                          <span style={{ ...cellStyle, fontFamily: MONO, fontSize: 17, fontWeight: 700, color: C.gold }}>{fmt(a.amount)}</span>
                          <span style={{ ...cellStyle, fontSize: 15 }}>{a.cuotas}</span>
                          <span style={cellStyle}><StatusPill status={a.status} /></span>
                          <span style={cellStyle}>
                            {a.status === "pendiente" && (
                              <button onClick={() => markTransferred(a.id)} style={{ background: "none", border: `1px solid #4E86C7`, color: "#9FC4F0", borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: BODY, whiteSpace: "nowrap" }}>
                                Hacer transferencia
                              </button>
                            )}
                            {a.status === "transferido" && (
                              <button onClick={() => markPaid(a.id)} style={{ background: "none", border: `1px solid ${C.cardBorder}`, color: C.tealSoft, borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: BODY, whiteSpace: "nowrap" }}>
                                Marcar recuperado
                              </button>
                            )}
                          </span>
                        </div>
                        {a.cuentaBanco && (
                          <div style={{ fontFamily: BODY, fontSize: 12.5, color: C.inkFaint, marginTop: 6 }}>
                            Transferir a: <span style={{ color: C.inkDim, fontFamily: MONO }}>{a.cuentaBanco}</span>
                          </div>
                        )}
                        {(a.status === "transferido" || a.status === "recuperado") && (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                            {a.comprobante ? (
                              <a href={a.comprobante} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                                <img src={a.comprobante} alt="Comprobante" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.cardBorder}` }} />
                                <span style={{ fontFamily: BODY, fontSize: 12, color: C.tealSoft }}>Ver comprobante</span>
                              </a>
                            ) : (
                              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: BODY, fontSize: 12, color: C.inkFaint, cursor: "pointer", border: `1px dashed ${C.cardBorder}`, borderRadius: 7, padding: "5px 10px" }}>
                                {comprobanteBusyId === a.id ? <Loader2 size={13} className="spin" /> : <FileCheck size={13} />}
                                {comprobanteBusyId === a.id ? "Subiendo..." : "Subir comprobante"}
                                <input
                                  type="file" accept="image/*" style={{ display: "none" }} disabled={comprobanteBusyId === a.id}
                                  onChange={(e) => uploadComprobante(a.id, e.target.files && e.target.files[0])}
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </Card>
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontFamily: DISPLAY, color: C.ink, fontSize: 18, margin: 0 }}>Colaboradores</h3>
                <Button variant="secondary" onClick={() => setShowAdd(true)}><Plus size={15} /> Agregar</Button>
              </div>
              {employees.length === 0 ? <EmptyNote>Aún no has agregado colaboradores.</EmptyNote> : <TableHead cols={["Nombre", "Salario", "Devengado hoy", "Disponible", ""]} five />}
              {employees.map((e) => {
                const dailyRate = e.monthlySalary / 30;
                const devengado = Math.round(dailyRate * cycleDay);
                const avail = Math.round((devengado * 0.5) / 50) * 50;
                const isOpen = expandedEmployeeId === e.id;
                const empAdvances = advances
                  .filter((a) => a.employeeId === e.id)
                  .sort((a, b) => b.requestedAt - a.requestedAt);
                return (
                  <div key={e.id}>
                    <div className="av-table-row av-table-row-5" style={{ padding: "12px 0", borderBottom: `1px solid ${C.cardBorder}` }}>
                      <span style={{ ...cellStyle, fontWeight: 600 }}>{e.name}</span>
                      <span style={{ ...cellStyle, fontFamily: MONO }}>{fmt(e.monthlySalary)}</span>
                      <span style={{ ...cellStyle, fontFamily: MONO }}>{fmt(devengado)}</span>
                      <span style={{ ...cellStyle, fontFamily: MONO, color: C.teal }}>{fmt(avail)}</span>
                      <span>
                        <button
                          onClick={() => setExpandedEmployeeId(isOpen ? null : e.id)}
                          aria-label="Ver solicitudes del colaborador"
                          style={{ background: "none", border: `1px solid ${C.cardBorder}`, color: C.inkDim, borderRadius: 7, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <ChevronDown size={14} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                        </button>
                      </span>
                    </div>
                    {isOpen && (
                      <div style={{ background: C.bgAlt, borderRadius: 10, padding: 16, margin: "0 0 12px", border: `1px solid ${C.cardBorder}` }}>
                        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 12.5, color: C.inkFaint, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>
                          Solicitudes de {e.name}
                        </div>
                        {empAdvances.length === 0 ? (
                          <EmptyNote>Este colaborador todavía no ha solicitado ningún adelanto.</EmptyNote>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {empAdvances.map((a) => (
                              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: C.card, borderRadius: 9, border: `1px solid ${C.cardBorder}` }}>
                                <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: C.gold }}>{fmt(a.amount)}</span>
                                <span style={{ fontFamily: BODY, fontSize: 13, color: C.inkDim }}>
                                  {new Date(a.requestedAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                                  {" · "}
                                  {new Date(a.requestedAt).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <StatusPill status={a.status} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
          </>
        )}
        {tab === "nomina" && (
          <NominaImport
            company={company} token={token} records={payrollRecords} employeeCount={employees.length}
            imports={payrollImports} onUpdate={applyDashboard}
          />
        )}
        {tab === "proximaNomina" && (
          <ProximaNomina company={company} token={token} employees={employees} advances={advances} onUpdate={applyDashboard} />
        )}
      </div>
      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)} onSubmit={addEmployee} />}
    </div>
  );
}

/* ---------------------------------------------------------------------
   ERROR BOUNDARY
------------------------------------------------------------------- */
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 14 }}>
          <style>{GLOBAL_CSS}</style>
          <AlertCircle size={28} color={C.danger} />
          <p style={{ fontFamily: BODY, color: C.ink, fontSize: 14, textAlign: "center", maxWidth: 340 }}>
            Algo falló al mostrar la app: {String((this.state.error && this.state.error.message) || this.state.error)}
          </p>
          <button onClick={() => window.location.reload()} style={{ fontFamily: BODY, fontWeight: 600, fontSize: 14, borderRadius: 10, padding: "12px 20px", border: "none", cursor: "pointer", background: C.gold, color: "#2B1B0F" }}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* =======================================================================
   ROOT — routes between the website and the app
======================================================================= */
function ConfigMissingNotice() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 14 }}>
      <GlobalStyle />
      <AlertCircle size={28} color={C.danger} />
      <p style={{ fontFamily: BODY, color: C.ink, fontSize: 14, textAlign: "center", maxWidth: 360 }}>
        Falta configurar Supabase: define <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en tu archivo <code>.env</code> y reinicia el servidor.
      </p>
    </div>
  );
}

function VanzaApp() {
  const [page, setPage] = useState("web"); // 'web' | 'portal' | 'employee' | 'company'
  const [session, setSession] = useState(() => api.loadSession()); // { type: 'employee'|'company', token, data }

  useEffect(() => { ensureFonts(); }, []);

  const login = (nextSession) => {
    api.persistSession(nextSession);
    setSession(nextSession);
  };
  const logout = () => {
    if (session) api.logout(session.token);
    api.persistSession(null);
    setSession(null);
    setPage("web");
  };

  // El sitio de mercadeo no necesita Supabase para nada — solo lo exigimos
  // al intentar iniciar sesión o entrar a un panel.
  const needsSupabase = session || page === "portal" || page === "employee" || page === "company";
  if (needsSupabase && !supabaseConfigured) {
    return <ConfigMissingNotice />;
  }

  let content;
  if (!session) {
    if (page === "web") content = <MarketingWebsite onLogin={() => setPage("portal")} />;
    else if (page === "portal") content = <AccessPortal onPick={setPage} onBackToSite={() => setPage("web")} />;
    else if (page === "employee") content = <EmployeeLogin onBack={() => setPage("portal")} onLogin={login} />;
    else if (page === "company") content = <CompanyLogin onBack={() => setPage("portal")} onLogin={login} />;
  } else if (session.type === "employee") {
    content = <EmployeeDashboard employee={session.data} token={session.token} onLogout={logout} />;
  } else {
    content = <CompanyDashboard company={session.data} token={session.token} onLogout={logout} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <GlobalStyle />
      {content}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <VanzaApp />
    </ErrorBoundary>
  );
}
