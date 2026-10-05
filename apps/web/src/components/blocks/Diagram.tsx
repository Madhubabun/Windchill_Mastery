"use client";

import { useId, useMemo } from "react";
import type { DiagramSpec } from "@wm/core";

type Node = DiagramSpec["nodes"][number];
type Tone = Node["tone"];

export const TONES: Record<Tone, { fill: string; stroke: string; text: string; sub: string }> = {
  primary: { fill: "var(--primary-soft)", stroke: "var(--primary)", text: "var(--text)", sub: "var(--muted)" },
  accent: { fill: "url(#__grad)", stroke: "transparent", text: "#fff", sub: "rgba(255,255,255,.85)" },
  success: { fill: "var(--mint-soft)", stroke: "var(--mint)", text: "var(--text)", sub: "var(--muted)" },
  warning: { fill: "var(--amber-soft)", stroke: "var(--amber)", text: "var(--text)", sub: "var(--muted)" },
  danger: { fill: "var(--coral-soft)", stroke: "var(--coral)", text: "var(--text)", sub: "var(--muted)" },
  info: { fill: "var(--sky-soft)", stroke: "var(--sky)", text: "var(--text)", sub: "var(--muted)" },
  neutral: { fill: "var(--surface-2)", stroke: "var(--line)", text: "var(--text)", sub: "var(--muted)" },
};

const center = (n: Node) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });

/** Point where the line from the node centre towards (tx, ty) leaves the node's box. */
function exitPoint(n: Node, tx: number, ty: number, pad = 4) {
  const c = center(n);
  const dx = tx - c.x;
  const dy = ty - c.y;
  if (dx === 0 && dy === 0) return c;
  const hw = n.w / 2 + pad;
  const hh = n.h / 2 + pad;
  const t = Math.min(dx !== 0 ? hw / Math.abs(dx) : Infinity, dy !== 0 ? hh / Math.abs(dy) : Infinity);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

function Shape({ n, tone }: { n: Node; tone: (typeof TONES)[Tone] }) {
  const common = { fill: tone.fill, stroke: tone.stroke, strokeWidth: 1.5 };
  switch (n.shape) {
    case "pill":
      return <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={n.h / 2} {...common} />;
    case "circle":
      return <ellipse cx={n.x + n.w / 2} cy={n.y + n.h / 2} rx={n.w / 2} ry={n.h / 2} {...common} />;
    case "cylinder": {
      const ry = Math.min(10, n.h / 5);
      const { x, y, w, h } = n;
      return (
        <g>
          <path d={`M${x},${y + ry} v${h - 2 * ry} a${w / 2},${ry} 0 0 0 ${w},0 v${-(h - 2 * ry)}`} {...common} />
          <ellipse cx={x + w / 2} cy={y + ry} rx={w / 2} ry={ry} {...common} />
        </g>
      );
    }
    case "doc": {
      const f = 14;
      const { x, y, w, h } = n;
      return <path d={`M${x + 8},${y} H${x + w - f} L${x + w},${y + f} V${y + h - 8} Q${x + w},${y + h} ${x + w - 8},${y + h} H${x + 8} Q${x},${y + h} ${x},${y + h - 8} V${y + 8} Q${x},${y} ${x + 8},${y} Z`} {...common} />;
    }
    default:
      return <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={12} {...common} />;
  }
}

export interface DiagramCanvasProps {
  spec: DiagramSpec;
  /** Node ids to show; undefined = all. */
  visible?: Set<string>;
  highlight?: Set<string>;
  /** Edge keys "from>to" to animate. */
  flow?: Set<string>;
  selected?: string | null;
  onSelect?: (id: string) => void;
  title: string;
}

export function DiagramCanvas({ spec, visible, highlight, flow, selected, onSelect, title }: DiagramCanvasProps) {
  const uid = useId().replace(/:/g, "");
  const byId = useMemo(() => new Map(spec.nodes.map((n) => [n.id, n])), [spec.nodes]);
  const isVisible = (id: string) => !visible || visible.has(id);

  return (
    <svg viewBox={`0 0 ${spec.width} ${spec.height}`} className="w-full h-auto select-none" role="group" aria-label={title}>
      <defs>
        <linearGradient id="__grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5B3DF5" />
          <stop offset="55%" stopColor="#7B5CFF" />
          <stop offset="100%" stopColor="#12B5A0" />
        </linearGradient>
        <marker id={`arrow-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" />
        </marker>
        <marker id={`arrow-flow-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--primary)" />
        </marker>
      </defs>

      {spec.groups.map((g, i) => (
        <g key={i}>
          <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={18} fill={TONES[g.tone].fill} fillOpacity={0.5} stroke={TONES[g.tone].stroke} strokeDasharray="6 5" />
          <text x={g.x + 14} y={g.y + 22} fontSize={12} fontWeight={700} fill="var(--muted)" style={{ letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {g.label}
          </text>
        </g>
      ))}

      {spec.edges.map((e, i) => {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!a || !b) return null;
        const show = isVisible(a.id) && isVisible(b.id);
        const ca = center(a);
        const cb = center(b);
        const p1 = exitPoint(a, cb.x, cb.y);
        const p2 = exitPoint(b, ca.x, ca.y, 6);
        const flowing = flow?.has(`${e.from}>${e.to}`) || (e.bidirectional && flow?.has(`${e.to}>${e.from}`));
        const reverse = !!(e.bidirectional && flow?.has(`${e.to}>${e.from}`) && !flow?.has(`${e.from}>${e.to}`));
        const d = reverse ? `M${p2.x},${p2.y} L${p1.x},${p1.y}` : `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const marker = `url(#${flowing ? "arrow-flow" : "arrow"}-${uid})`;
        return (
          <g key={i} style={{ opacity: show ? 1 : 0, transition: "opacity var(--dur-slow) var(--ease)" }} aria-hidden>
            <path
              id={`edge-${uid}-${i}`}
              d={d}
              fill="none"
              stroke={flowing ? "var(--primary)" : "var(--muted)"}
              strokeOpacity={flowing ? 1 : 0.55}
              strokeWidth={flowing ? 2.5 : 1.6}
              strokeDasharray={e.dashed && !flowing ? "5 5" : undefined}
              className={flowing ? "flow-edge" : undefined}
              markerEnd={marker}
              markerStart={e.bidirectional ? marker : undefined}
            />
            {flowing && show && (
              <circle r={5} fill="var(--mint-fill)">
                <animateMotion dur="1.4s" repeatCount="indefinite">
                  <mpath href={`#edge-${uid}-${i}`} />
                </animateMotion>
              </circle>
            )}
            {e.label && (
              <g>
                <rect x={mid.x - e.label.length * 3.4 - 6} y={mid.y - 10} width={e.label.length * 6.8 + 12} height={20} rx={10} fill="var(--surface)" stroke="var(--line)" />
                <text x={mid.x} y={mid.y + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--muted)">
                  {e.label}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {spec.nodes.map((n) => {
        const tone = TONES[n.tone];
        const show = isVisible(n.id);
        const hi = highlight?.has(n.id);
        const sel = selected === n.id;
        const interactive = !!onSelect && !!(n.detail || n.real);
        const fs = Math.min(15, (n.w - 16) / Math.max(1, n.label.length * 0.56));
        const subFs = n.sublabel ? Math.min(12, (n.w - 14) / Math.max(1, n.sublabel.length * 0.52)) : 0;
        const c = center(n);
        return (
          <g
            key={n.id}
            style={{ opacity: show ? 1 : 0, transition: "opacity var(--dur-slow) var(--ease), transform var(--dur-slow) var(--ease)", transform: show ? "none" : "translateY(8px)", cursor: interactive ? "pointer" : "default", outline: "none" }}
            tabIndex={interactive && show ? 0 : -1}
            role={interactive ? "button" : undefined}
            aria-label={interactive ? `${n.label}${n.sublabel ? `, ${n.sublabel}` : ""}` : undefined}
            aria-expanded={interactive ? sel : undefined}
            onClick={() => interactive && onSelect?.(n.id)}
            onKeyDown={(e) => {
              if (interactive && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelect?.(n.id);
              }
            }}
          >
            {(hi || sel) && (
              <rect x={n.x - 6} y={n.y - 6} width={n.w + 12} height={n.h + 12} rx={n.shape === "pill" ? (n.h + 12) / 2 : 16} fill="none" stroke={sel ? "var(--primary)" : "var(--mint-fill)"} strokeWidth={3} className={hi && !sel ? "pulse" : undefined} />
            )}
            <Shape n={n} tone={tone} />
            <text x={c.x} y={n.sublabel ? c.y - 2 + (n.shape === "cylinder" ? 4 : 0) : c.y + fs / 3 + (n.shape === "cylinder" ? 4 : 0)} textAnchor="middle" fontSize={fs} fontWeight={700} fill={tone.text} style={{ fontFamily: "var(--font-body)" }}>
              {n.label}
            </text>
            {n.sublabel && (
              <text x={c.x} y={c.y + subFs + 3 + (n.shape === "cylinder" ? 4 : 0)} textAnchor="middle" fontSize={subFs} fontWeight={500} fill={tone.sub}>
                {n.sublabel}
              </text>
            )}
            {interactive && (
              <circle cx={n.x + n.w - 8} cy={n.y + 8} r={4} fill={sel ? "var(--primary)" : "var(--mint-fill)"} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
