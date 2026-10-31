"use client";

import { useState, useEffect, useCallback } from "react";

type Slide = {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  caption: string;
  speech: string;
  badge: string;
};

const SLIDES: Slide[] = [
  {
    id: 1,
    tag: "ESCENA 1 · EL MITO",
    title: "«Yo solo vendo por WhatsApp, no soy un banco»",
    subtitle: "Conoce a Carlos. Tiene una tienda en Lima y cree que la Ley 29733 es solo para empresas gigantes.",
    caption:
      "Si pides nombre, DNI, celular, correo o dirección para vender, hacer delivery, agendar citas o pagar planilla... ya tratas datos personales y la Ley 29733 te aplica.",
    speech: "Solo anoto pedidos en mi cuaderno, WhatsApp y un Excel... ¿eso es ilegal?",
    badge: "RUC 10 y RUC 20 están obligados",
  },
  {
    id: 2,
    tag: "ESCENA 2 · OBLIGACIÓN #1",
    title: "Inscribir tus «Bancos de Datos» (¡No es un banco de plata!)",
    subtitle: "Un «Banco de datos» es simplemente cualquier lista de personas que guarda tu negocio.",
    caption:
      "Muchas MYPE tienen al menos 3 listas: 1) Clientes, 2) Trabajadores y 3) Proveedores (o cámaras de seguridad). Debes declararlas gratis (S/ 0) en el portal SIPDP de la ANPD.",
    speech: "¡Ah! Mi Excel de clientes y mi carpeta de planilla son mis «bancos de datos».",
    badge: "Trámite 100 % gratuito en SIPDP",
  },
  {
    id: 3,
    tag: "ESCENA 3 · OBLIGACIÓN #2",
    title: "Avisar y pedir permiso antes de mandar publicidad",
    subtitle: "Vender un producto permite entregar el pedido, pero NO mandar promociones sin permiso.",
    caption:
      "Necesitas dos cosas: 1) Tu Política de Privacidad pública y 2) Un texto corto de consentimiento en tu web o WhatsApp para quien sí quiera recibir ofertas.",
    speech: "Antes de meter a alguien a mi lista de difusión de ofertas, le pido su OK.",
    badge: "Prohibido el spam sin consentimiento",
  },
  {
    id: 4,
    tag: "ESCENA 4 · OBLIGACIÓN #3",
    title: "Atender los Derechos ARCO a tiempo",
    subtitle: "Los datos no son propiedad de tu empresa: son prestados por el cliente (el «Titular»).",
    caption:
      "Si un cliente pide saber qué datos tienes de él (Acceso: máx. 20 días hábiles) o pide corregir o borrar su número (Rectificación / Cancelación / Oposición: máx. 10 días hábiles), debes responderle gratis y guardar la prueba.",
    speech: "Si me piden «borra mi número», lo borro y archivo la constancia en mi expediente.",
    badge: "Plazos: 10 a 20 días hábiles",
  },
  {
    id: 5,
    tag: "ESCENA 5 · OBLIGACIÓN #4",
    title: "Seguridad y el reloj de 48 horas ante incidentes",
    subtitle: "¿Qué pasa si te roban la laptop, hackean tu cuenta o filtras correos por error?",
    caption:
      "El nuevo reglamento (DS 016-2024-JUS) exige tener un Documento de Seguridad interno y, si ocurre una filtración grave de datos, notificar a la ANPD en máximo 48 horas.",
    speech: "Con mi expediente en orden, puedo demostrar que cumplo si me fiscalizan.",
    badge: "Multas de 0.5 a 100 UIT",
  },
];

function SketchIllustration({ scene }: { scene: number }) {
  return (
    <svg
      viewBox="0 0 680 340"
      className="h-full w-full select-none"
      role="img"
      aria-label={`Ilustración animada escena ${scene}`}
    >
      <defs>
        <pattern id="sketch-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M 24 0 L 0 0 0 24"
            fill="none"
            stroke="#d9cfbc"
            strokeWidth="0.7"
            strokeDasharray="2,2"
          />
        </pattern>
        <filter id="sketch-shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="3" dy="4" stdDeviation="0" floodColor="#17191e" floodOpacity="0.14" />
        </filter>
      </defs>

      {/* Hand-drawn paper background */}
      <rect width="680" height="340" fill="#fbf7ee" />
      <rect width="680" height="340" fill="url(#sketch-grid)" />

      {/* Sketch frame border */}
      <path
        d="M 14 14 Q 340 10 666 15 Q 669 170 665 326 Q 340 329 15 325 Q 11 170 14 14 Z"
        fill="none"
        stroke="#17191e"
        strokeWidth="2"
      />

      {scene === 1 && (
        <g>
          {/* Store owner Carlos */}
          <g transform="translate(75, 68)">
            {/* Desk */}
            <path d="M -20 190 L 210 190 L 200 235 L -10 235 Z" fill="#f5f0e5" stroke="#17191e" strokeWidth="2.2" />
            {/* Head */}
            <circle cx="85" cy="65" r="34" fill="#fffdf8" stroke="#17191e" strokeWidth="2.5" />
            {/* Hair sketch */}
            <path d="M 55 52 Q 70 22 108 36 Q 118 44 116 58" fill="none" stroke="#17191e" strokeWidth="2.5" strokeLinecap="round" />
            {/* Eyes & surprised eyebrows */}
            <circle cx="74" cy="63" r="3" fill="#17191e" />
            <circle cx="98" cy="63" r="3" fill="#17191e" />
            <path d="M 66 50 Q 74 44 82 50" fill="none" stroke="#17191e" strokeWidth="2" strokeLinecap="round" />
            <path d="M 90 50 Q 98 44 106 50" fill="none" stroke="#17191e" strokeWidth="2" strokeLinecap="round" />
            {/* Mouth */}
            <path d="M 76 79 Q 86 86 96 78" fill="none" stroke="#17191e" strokeWidth="2.2" strokeLinecap="round" />
            {/* Body / Apron */}
            <path d="M 42 190 C 42 125 128 125 128 190 Z" fill="#fffdf8" stroke="#17191e" strokeWidth="2.5" />
            <rect x="62" y="142" width="46" height="48" fill="#b0241c" fillOpacity="0.15" stroke="#b0241c" strokeWidth="1.8" />
            <text x="85" y="170" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#b0241c" fontWeight="bold">
              MI NEGOCIO
            </text>
            {/* Question marks floating */}
            <text x="25" y="38" fontSize="24" fontWeight="bold" fill="#b0241c">?</text>
            <text x="132" y="34" fontSize="20" fontWeight="bold" fill="#a9761b">?</text>
          </g>

          {/* Arrow connecting to everyday data items */}
          <path
            d="M 255 165 Q 305 140 345 160"
            fill="none"
            stroke="#b0241c"
            strokeWidth="2.5"
            strokeDasharray="5,4"
          />
          <polygon points="348,161 338,154 340,166" fill="#b0241c" />

          {/* 3 Cards showing everyday data */}
          <g transform="translate(365, 36)" filter="url(#sketch-shadow)">
            <rect x="0" y="0" width="265" height="76" rx="4" fill="#fffdf8" stroke="#17191e" strokeWidth="2" />
            <rect x="14" y="16" width="42" height="42" rx="4" fill="#3f6b52" fillOpacity="0.15" stroke="#3f6b52" strokeWidth="1.8" />
            <text x="35" y="42" textAnchor="middle" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="#3f6b52">WA</text>
            <text x="70" y="30" fontSize="13" fontWeight="bold" fill="#17191e">WhatsApp y Redes</text>
            <text x="70" y="48" fontSize="11" fill="#52565e">Nombres, celulares, direcciones</text>
            <text x="70" y="63" fontSize="10" fontFamily="monospace" fill="#b0241c">= DATOS PERSONALES</text>
          </g>

          <g transform="translate(365, 128)" filter="url(#sketch-shadow)">
            <rect x="0" y="0" width="265" height="76" rx="4" fill="#fffdf8" stroke="#17191e" strokeWidth="2" />
            <rect x="14" y="16" width="42" height="42" rx="4" fill="#a9761b" fillOpacity="0.15" stroke="#a9761b" strokeWidth="1.8" />
            <text x="35" y="42" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#a9761b">XLS</text>
            <text x="70" y="30" fontSize="13" fontWeight="bold" fill="#17191e">Excel de Clientes / Boletas</text>
            <text x="70" y="48" fontSize="11" fill="#52565e">DNI, correos, historial de compras</text>
            <text x="70" y="63" fontSize="10" fontFamily="monospace" fill="#b0241c">= DATOS PERSONALES</text>
          </g>

          <g transform="translate(365, 220)" filter="url(#sketch-shadow)">
            <rect x="0" y="0" width="265" height="76" rx="4" fill="#fffdf8" stroke="#17191e" strokeWidth="2" />
            <rect x="14" y="16" width="42" height="42" rx="4" fill="#b0241c" fillOpacity="0.15" stroke="#b0241c" strokeWidth="1.8" />
            <text x="35" y="42" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#b0241c">CV</text>
            <text x="70" y="30" fontSize="13" fontWeight="bold" fill="#17191e">Planilla y Cámaras</text>
            <text x="70" y="48" fontSize="11" fill="#52565e">Contratos, sueldos, descansos, rostros</text>
            <text x="70" y="63" fontSize="10" fontFamily="monospace" fill="#b0241c">= DATOS SENSIBLES</text>
          </g>
        </g>
      )}

      {scene === 2 && (
        <g>
          {/* Left: Wrong idea (Bank with money) crossed out */}
          <g transform="translate(42, 48)" filter="url(#sketch-shadow)">
            <rect x="0" y="0" width="185" height="195" rx="4" fill="#fffdf8" stroke="#17191e" strokeWidth="2" />
            <polygon points="92,22 25,62 160,62" fill="#f5f0e5" stroke="#17191e" strokeWidth="2" />
            <rect x="38" y="62" width="16" height="58" fill="#f5f0e5" stroke="#17191e" strokeWidth="1.8" />
            <rect x="84" y="62" width="16" height="58" fill="#f5f0e5" stroke="#17191e" strokeWidth="1.8" />
            <rect x="130" y="62" width="16" height="58" fill="#f5f0e5" stroke="#17191e" strokeWidth="1.8" />
            <rect x="25" y="120" width="135" height="12" fill="#17191e" />
            <text x="92" y="54" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#17191e">BANCO S/ $$$</text>
            {/* Big red X */}
            <path d="M 25 25 L 160 135 M 160 25 L 25 135" stroke="#b0241c" strokeWidth="5" strokeLinecap="round" />
            <text x="92" y="162" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#b0241c">
              ¡NO ES UN BANCO
            </text>
            <text x="92" y="178" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#b0241c">
              FINANCIERO!
            </text>
          </g>

          {/* Right: 3 Folders = Bancos de Datos + SIPDP stamp */}
          <g transform="translate(260, 40)">
            <text x="0" y="18" fontSize="13" fontFamily="monospace" fontWeight="bold" fill="#3f6b52">
              LO QUE REALMENTE ES UN «BANCO DE DATOS»:
            </text>

            {[
              { y: 34, code: "BANCO #1", name: "Lista de Clientes", desc: "Compradores web, WhatsApp, boletas y envíos" },
              { y: 108, code: "BANCO #2", name: "Lista de Trabajadores", desc: "Planilla, recibos por honorarios, postulantes" },
              { y: 182, code: "BANCO #3", name: "Lista de Proveedores / Cámaras", desc: "Contactos de proveedores, grabaciones de local" },
            ].map((item) => (
              <g key={item.code} transform={`translate(0, ${item.y})`} filter="url(#sketch-shadow)">
                <rect x="0" y="0" width="375" height="62" rx="3" fill="#fffdf8" stroke="#17191e" strokeWidth="2" />
                <rect x="12" y="12" width="76" height="38" rx="2" fill="#3f6b52" fillOpacity="0.14" stroke="#3f6b52" strokeWidth="1.5" />
                <text x="50" y="35" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#3f6b52">
                  {item.code}
                </text>
                <text x="102" y="27" fontSize="13" fontWeight="bold" fill="#17191e">{item.name}</text>
                <text x="102" y="45" fontSize="11" fill="#52565e">{item.desc}</text>
              </g>
            ))}

            {/* Stamp */}
            <g transform="translate(245, 248) rotate(-4)">
              <rect x="0" y="0" width="132" height="36" fill="#b0241c" rx="3" />
              <text x="66" y="16" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#fbf7ee">
                INSCRIPCIÓN SIPDP
              </text>
              <text x="66" y="29" textAnchor="middle" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="#fbf7ee">
                COSTO: S/ 0 (GRATIS)
              </text>
            </g>
          </g>
        </g>
      )}

      {scene === 3 && (
        <g>
          {/* Left card: Política de privacidad */}
          <g transform="translate(48, 42)" filter="url(#sketch-shadow)">
            <rect x="0" y="0" width="255" height="245" rx="4" fill="#fffdf8" stroke="#17191e" strokeWidth="2.2" />
            <rect x="0" y="0" width="255" height="38" fill="#17191e" />
            <text x="16" y="24" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="#fbf7ee">
              1. POLÍTICA DE PRIVACIDAD
            </text>
            <text x="20" y="65" fontSize="13" fontWeight="bold" fill="#17191e">
              Tu «Regla de Juego» pública
            </text>
            <line x1="20" y1="78" x2="230" y2="78" stroke="#d9cfbc" strokeWidth="2" />
            <text x="20" y="102" fontSize="11.5" fill="#52565e">• Quién eres (Razón social y RUC)</text>
            <text x="20" y="126" fontSize="11.5" fill="#52565e">• Qué datos pides y para qué</text>
            <text x="20" y="150" fontSize="11.5" fill="#52565e">• Con quién los compartes (courier)</text>
            <text x="20" y="174" fontSize="11.5" fill="#52565e">• Cómo pueden pedir borrarlos</text>

            <rect x="20" y="196" width="215" height="32" rx="2" fill="#3f6b52" fillOpacity="0.14" stroke="#3f6b52" strokeWidth="1.5" />
            <text x="127" y="216" textAnchor="middle" fontSize="10.5" fontFamily="monospace" fontWeight="bold" fill="#3f6b52">
              Enlace listo: datosprivados.pe/p/tu-empresa
            </text>
          </g>

          {/* Right card: Consentimiento */}
          <g transform="translate(345, 42)" filter="url(#sketch-shadow)">
            <rect x="0" y="0" width="285" height="245" rx="4" fill="#fffdf8" stroke="#17191e" strokeWidth="2.2" />
            <rect x="0" y="0" width="285" height="38" fill="#b0241c" />
            <text x="16" y="24" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="#fbf7ee">
              2. CONSENTIMIENTO (PERMISO)
            </text>

            {/* Wrong checkbox */}
            <g transform="translate(18, 54)">
              <rect x="0" y="0" width="248" height="68" rx="3" fill="#b0241c" fillOpacity="0.06" stroke="#b0241c" strokeWidth="1.5" />
              <text x="12" y="20" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#b0241c">
                ✗ PROHIBIDO POR LEY:
              </text>
              <text x="12" y="38" fontSize="11" fill="#17191e">Casillas ya marcadas por defecto o</text>
              <text x="12" y="54" fontSize="11" fill="#17191e">meter clientes a listas spam sin preguntar.</text>
            </g>

            {/* Correct checkbox */}
            <g transform="translate(18, 136)">
              <rect x="0" y="0" width="248" height="92" rx="3" fill="#3f6b52" fillOpacity="0.08" stroke="#3f6b52" strokeWidth="1.8" />
              <text x="12" y="20" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#3f6b52">
                ✓ ASÍ SE HACE CORRECTAMENTE:
              </text>
              <rect x="12" y="32" width="16" height="16" fill="#fffdf8" stroke="#17191e" strokeWidth="2" />
              <path d="M 15 40 L 20 45 L 27 34" fill="none" stroke="#3f6b52" strokeWidth="2.5" />
              <text x="36" y="44" fontSize="11" fontWeight="bold" fill="#17191e">
                «Acepto recibir ofertas por WhatsApp»
              </text>
              <text x="12" y="66" fontSize="10.5" fill="#52565e">
                Libre, previo, expreso e informado.
              </text>
              <text x="12" y="81" fontSize="10" fontFamily="monospace" fill="#3f6b52">
                ¡Y guardas captura o registro del SÍ!
              </text>
            </g>
          </g>
        </g>
      )}

      {scene === 4 && (
        <g>
          {/* 4 ARCO pillars */}
          {[
            { x: 40, letter: "A", word: "ACCESO", desc: "«¿Qué datos míos tienen?»", days: "20 días hábiles", color: "#17191e" },
            { x: 192, letter: "R", word: "RECTIFICACIÓN", desc: "«Corrijan mi dirección o DNI»", days: "10 días hábiles", color: "#a9761b" },
            { x: 344, letter: "C", word: "CANCELACIÓN", desc: "«Eliminen mis datos de su base»", days: "10 días hábiles", color: "#b0241c" },
            { x: 496, letter: "O", word: "OPOSICIÓN", desc: "«No me envíen más publicidad»", days: "10 días hábiles", color: "#3f6b52" },
          ].map((item) => (
            <g key={item.letter} transform={`translate(${item.x}, 42)`} filter="url(#sketch-shadow)">
              <rect x="0" y="0" width="142" height="205" rx="4" fill="#fffdf8" stroke="#17191e" strokeWidth="2" />
              <circle cx="71" cy="46" r="24" fill={item.color} />
              <text x="71" y="55" textAnchor="middle" fontSize="24" fontFamily="serif" fontWeight="bold" fill="#fbf7ee">
                {item.letter}
              </text>
              <text x="71" y="94" textAnchor="middle" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="#17191e">
                {item.word}
              </text>
              <text x="71" y="122" textAnchor="middle" fontSize="10.5" fill="#52565e">
                {item.desc}
              </text>
              <rect x="14" y="156" width="114" height="32" rx="2" fill="#f5f0e5" stroke={item.color} strokeWidth="1.5" />
              <text x="71" y="170" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#52565e">
                PLAZO MÁXIMO
              </text>
              <text x="71" y="182" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill={item.color}>
                {item.days}
              </text>
            </g>
          ))}

          {/* Bottom bar */}
          <g transform="translate(40, 262)">
            <rect x="0" y="0" width="598" height="40" rx="3" fill="#17191e" />
            <text x="299" y="24" textAnchor="middle" fontSize="11.5" fontFamily="monospace" fill="#fbf7ee">
              100 % GRATUITO PARA EL CLIENTE · SI NO RESPONDES A TIEMPO, EL CLIENTE RECLAMA A LA ANPD
            </text>
          </g>
        </g>
      )}

      {scene === 5 && (
        <g>
          {/* Left: 48h Incident Clock */}
          <g transform="translate(48, 44)" filter="url(#sketch-shadow)">
            <rect x="0" y="0" width="270" height="240" rx="4" fill="#fffdf8" stroke="#17191e" strokeWidth="2.2" />
            <circle cx="135" cy="88" r="50" fill="#b0241c" fillOpacity="0.1" stroke="#b0241c" strokeWidth="3" />
            <line x1="135" y1="88" x2="135" y2="56" stroke="#b0241c" strokeWidth="3" strokeLinecap="round" />
            <line x1="135" y1="88" x2="162" y2="88" stroke="#b0241c" strokeWidth="3" strokeLinecap="round" />
            <text x="135" y="122" textAnchor="middle" fontSize="13" fontFamily="monospace" fontWeight="bold" fill="#b0241c">
              48 HORAS
            </text>
            <text x="135" y="164" textAnchor="middle" fontSize="13.5" fontWeight="bold" fill="#17191e">
              ¿Robo de laptop o filtración?
            </text>
            <text x="135" y="185" textAnchor="middle" fontSize="11" fill="#52565e">
              El DS 016-2024-JUS obliga a notificar
            </text>
            <text x="135" y="202" textAnchor="middle" fontSize="11" fill="#52565e">
              a la ANPD en máximo 48 horas si hay
            </text>
            <text x="135" y="219" textAnchor="middle" fontSize="11" fill="#52565e">
              riesgo para los datos de las personas.
            </text>
          </g>

          {/* Right: Complete checklist shield */}
          <g transform="translate(348, 44)" filter="url(#sketch-shadow)">
            <rect x="0" y="0" width="284" height="240" rx="4" fill="#fffdf8" stroke="#3f6b52" strokeWidth="2.5" />
            <rect x="0" y="0" width="284" height="40" fill="#3f6b52" />
            <text x="142" y="25" textAnchor="middle" fontSize="11.5" fontFamily="monospace" fontWeight="bold" fill="#fbf7ee">
              TU ESCUDO EN DATOSPRIVADOS (30 MIN)
            </text>

            {[
              "1. Bancos declarados + Ficha SIPDP",
              "2. Política de privacidad publicada",
              "3. Textos para WhatsApp y Web",
              "4. Canal ARCO con reloj de plazos",
              "5. Documento de Seguridad + Incidentes",
            ].map((line, idx) => (
              <g key={line} transform={`translate(20, ${58 + idx * 34})`}>
                <circle cx="10" cy="10" r="9" fill="#3f6b52" />
                <path d="M 6 10 L 9 13 L 14 7" fill="none" stroke="#fbf7ee" strokeWidth="2" />
                <text x="28" y="14" fontSize="11.5" fontWeight="bold" fill="#17191e">
                  {line}
                </text>
              </g>
            ))}
          </g>
        </g>
      )}
    </svg>
  );
}

export function ExplainerVideo() {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const SLIDE_DURATION_MS = 8500;

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % SLIDES.length);
    setProgress(0);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const interval = 100;
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (interval / SLIDE_DURATION_MS) * 100;
        if (next >= 100) {
          setCurrent((c) => (c + 1) % SLIDES.length);
          return 0;
        }
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [playing]);

  const slide = SLIDES[current];

  return (
    <div className="border border-ink bg-paper-2 shadow-[0_22px_55px_-32px_rgba(23,25,30,0.45)]">
      {/* Top video bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ink px-5 py-3.5 text-paper">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 rounded-full bg-crimson" />
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-paper/95">
            Video explicativo animado · En 1 minuto sin abogañol
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-paper/70">
            Escena {current + 1} de {SLIDES.length}
          </span>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="rounded-[2px] border border-paper/30 bg-paper/10 px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-[0.1em] text-paper transition-colors hover:border-crimson hover:bg-crimson"
          >
            {playing ? "❚❚ Pausar" : "▶ Reproducir"}
          </button>
        </div>
      </div>

      {/* Progress segments */}
      <div className="grid grid-cols-5 gap-1.5 bg-ink px-5 pb-3">
        {SLIDES.map((s, idx) => {
          const width = idx < current ? 100 : idx === current ? progress : 0;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setCurrent(idx);
                setProgress(0);
              }}
              aria-label={`Ir a escena ${idx + 1}: ${s.title}`}
              className="group py-1 text-left"
            >
              <div className="h-2 w-full overflow-hidden bg-paper/20">
                <div
                  className="h-full bg-crimson transition-all duration-100"
                  style={{ width: `${width}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Main visual stage */}
      <div className="grid lg:grid-cols-[1.22fr_0.78fr]">
        <div className="relative min-w-0 border-b border-line bg-[#fbf7ee] p-3 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="aspect-[2/1] w-full overflow-hidden">
            <SketchIllustration scene={slide.id} />
          </div>

          {/* Speech bubble overlay */}
          <div className="mt-3 flex items-center gap-3 rounded-[3px] border border-line-strong bg-paper px-4 py-3">
            <span className="shrink-0 rounded-[2px] bg-ink px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-paper">
              Caso real
            </span>
            <p className="text-[15.5px] italic text-ink">«{slide.speech}»</p>
          </div>
        </div>

        {/* Story explanation panel */}
        <div className="flex min-w-0 flex-col justify-between p-6 md:p-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-crimson">
                {slide.tag}
              </span>
              <span className="rounded-full border border-sage/40 bg-sage/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-sage">
                {slide.badge}
              </span>
            </div>

            <h3 className="mt-3.5 font-display text-[1.75rem] leading-[1.1] tracking-[-0.02em] text-ink">
              {slide.title}
            </h3>

            <p className="mt-3 text-base font-medium leading-relaxed text-ink">
              {slide.subtitle}
            </p>

            <p className="mt-3.5 border-l-3 border-crimson bg-paper px-4 py-3 text-[15px] leading-relaxed text-ink-soft">
              {slide.caption}
            </p>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <button
              type="button"
              onClick={prevSlide}
              className="btn btn-ghost btn-sm"
            >
              ← Anterior
            </button>

            <div className="flex items-center gap-2">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setCurrent(idx);
                    setProgress(0);
                  }}
                  className={`h-3 w-3 rounded-full border border-ink transition-colors ${
                    idx === current ? "border-crimson bg-crimson" : "bg-transparent hover:bg-ink/20"
                  }`}
                  aria-label={`Escena ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={nextSlide}
              className="btn btn-primary btn-sm"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
