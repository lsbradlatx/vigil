"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import type { SubstanceType } from "@/lib/stimulant-calculator";

interface CurvePoint {
  time: number; // unix ms
  mgActive: number;
}

interface DoseMarker {
  time: number;
  substance: SubstanceType;
  mg: number;
}

interface ConcentrationTimelineProps {
  /** { substance: CurvePoint[] } -- one curve per enabled substance */
  curves: Partial<Record<SubstanceType, CurvePoint[]>>;
  /** Dose markers to show on the chart */
  doseMarkers?: DoseMarker[];
  /** Sleep time as unix ms (shaded zone starts here) */
  sleepTime?: number;
  /** Chart window start, unix ms (default: 6 AM today) */
  startTime?: number;
  /** Chart window end, unix ms (default: sleepTime + 2h or midnight) */
  endTime?: number;
  /** Per-substance recommended max active mg (shown as dotted line) */
  maxActiveMg?: Partial<Record<SubstanceType, number>>;
  className?: string;
}

const SUBSTANCE_COLORS: Record<SubstanceType, string> = {
  CAFFEINE: "#6D7355",    // sage
  ADDERALL: "#AFBEC6",    // slate-blue
  DEXEDRINE: "#8B9EC3",   // slightly deeper blue
  NICOTINE: "#C5A682",    // stone
};

const SUBSTANCE_LABELS: Record<SubstanceType, string> = {
  CAFFEINE: "Caffeine",
  ADDERALL: "Adderall",
  DEXEDRINE: "Dexedrine",
  NICOTINE: "Nicotine",
};

const PADDING = { top: 24, right: 16, bottom: 40, left: 46 };
const SVG_WIDTH = 720;
const SVG_HEIGHT = 260;
const CHART_W = SVG_WIDTH - PADDING.left - PADDING.right;
const CHART_H = SVG_HEIGHT - PADDING.top - PADDING.bottom;

export function ConcentrationTimeline({
  curves,
  doseMarkers = [],
  sleepTime,
  startTime: startTimeProp,
  endTime: endTimeProp,
  maxActiveMg,
  className = "",
}: ConcentrationTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const substances = useMemo(
    () => (Object.keys(curves) as SubstanceType[]).filter((s) => (curves[s]?.length ?? 0) > 0),
    [curves],
  );

  const { startTime, endTime, maxMg } = useMemo(() => {
    let st = startTimeProp ?? 0;
    let et = endTimeProp ?? 0;
    let peak = 10;

    for (const s of substances) {
      const pts = curves[s] ?? [];
      for (const p of pts) {
        if (!st || p.time < st) st = p.time;
        if (!et || p.time > et) et = p.time;
        if (p.mgActive > peak) peak = p.mgActive;
      }
    }

    if (st === et) { et = st + 16 * 3_600_000; }
    const maxVal = maxActiveMg
      ? Math.max(peak, ...Object.values(maxActiveMg).filter((v): v is number => v != null))
      : peak;
    return { startTime: st, endTime: et, maxMg: Math.ceil(maxVal / 10) * 10 + 10 };
  }, [curves, substances, startTimeProp, endTimeProp, maxActiveMg]);

  const xScale = useCallback((t: number) => PADDING.left + ((t - startTime) / (endTime - startTime)) * CHART_W, [startTime, endTime]);
  const yScale = useCallback((mg: number) => PADDING.top + CHART_H - (mg / maxMg) * CHART_H, [maxMg]);

  const timeLabels = useMemo(() => {
    const labels: { x: number; label: string }[] = [];
    const stepMs = 2 * 3_600_000;
    const first = Math.ceil(startTime / stepMs) * stepMs;
    for (let t = first; t <= endTime; t += stepMs) {
      const d = new Date(t);
      const h = d.getHours();
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      labels.push({ x: xScale(t), label: `${h12}${ampm}` });
    }
    return labels;
  }, [startTime, endTime, xScale]);

  const mgLabels = useMemo(() => {
    const labels: { y: number; label: string }[] = [];
    const step = maxMg <= 50 ? 10 : maxMg <= 200 ? 25 : 50;
    for (let mg = 0; mg <= maxMg; mg += step) {
      labels.push({ y: yScale(mg), label: `${mg}` });
    }
    return labels;
  }, [maxMg, yScale]);

  const hoverInfo = useMemo(() => {
    if (hoverX == null) return null;
    const t = startTime + ((hoverX - PADDING.left) / CHART_W) * (endTime - startTime);
    if (t < startTime || t > endTime) return null;
    const d = new Date(t);
    const vals: { substance: SubstanceType; mg: number }[] = [];
    for (const s of substances) {
      const pts = curves[s] ?? [];
      let closest = pts[0];
      let minDist = Infinity;
      for (const p of pts) {
        const dist = Math.abs(p.time - t);
        if (dist < minDist) { minDist = dist; closest = p; }
      }
      if (closest) vals.push({ substance: s, mg: Math.round(closest.mgActive * 10) / 10 });
    }
    return { time: d, vals, x: hoverX };
  }, [hoverX, startTime, endTime, curves, substances]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = SVG_WIDTH / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    if (x >= PADDING.left && x <= SVG_WIDTH - PADDING.right) {
      setHoverX(x);
    } else {
      setHoverX(null);
    }
  }, []);

  if (substances.length === 0) {
    return (
      <div className={`card-deco p-4 text-center text-charcoal ${className}`}>
        <p>No stimulant data to display. Log a dose to see your concentration timeline.</p>
      </div>
    );
  }

  return (
    <div className={`card-deco overflow-hidden ${className}`}>
      <h3 className="font-display text-lg px-4 pt-3 pb-1" style={{ color: "var(--color-obsidian)" }}>
        Concentration Timeline
      </h3>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverX(null)}
        style={{ cursor: "crosshair" }}
      >
        {/* Grid lines */}
        {mgLabels.map((l, i) => (
          <g key={`mg-${i}`}>
            <line x1={PADDING.left} x2={SVG_WIDTH - PADDING.right} y1={l.y} y2={l.y}
              stroke="var(--color-border)" strokeWidth={0.6} />
            <text x={PADDING.left - 6} y={l.y + 4} textAnchor="end" fontSize={10} fill="var(--color-text-muted)">{l.label}</text>
          </g>
        ))}
        {timeLabels.map((l, i) => (
          <g key={`t-${i}`}>
            <line x1={l.x} x2={l.x} y1={PADDING.top} y2={PADDING.top + CHART_H}
              stroke="var(--color-border)" strokeWidth={0.6} />
            <text x={l.x} y={SVG_HEIGHT - 8} textAnchor="middle" fontSize={10} fill="var(--color-text-muted)">{l.label}</text>
          </g>
        ))}

        {/* Sleep zone */}
        {sleepTime != null && sleepTime >= startTime && sleepTime <= endTime && (
          <rect
            x={xScale(sleepTime)}
            y={PADDING.top}
            width={Math.max(0, SVG_WIDTH - PADDING.right - xScale(sleepTime))}
            height={CHART_H}
            fill="var(--color-bg-dark)"
            opacity={0.18}
          />
        )}

        {/* Max active lines */}
        {maxActiveMg && substances.map((s) => {
          const cap = maxActiveMg[s];
          if (cap == null || cap <= 0 || cap > maxMg) return null;
          return (
            <line key={`cap-${s}`}
              x1={PADDING.left} x2={SVG_WIDTH - PADDING.right}
              y1={yScale(cap)} y2={yScale(cap)}
              stroke={SUBSTANCE_COLORS[s]} strokeWidth={1} strokeDasharray="4 3" opacity={0.5}
            />
          );
        })}

        {/* Concentration curves */}
        {substances.map((s) => {
          const pts = curves[s] ?? [];
          if (pts.length < 2) return null;
          const d = pts.map((p, i) =>
            `${i === 0 ? "M" : "L"}${xScale(p.time).toFixed(1)},${yScale(p.mgActive).toFixed(1)}`
          ).join(" ");
          return (
            <path key={s} d={d} fill="none" stroke={SUBSTANCE_COLORS[s]} strokeWidth={2} opacity={0.85} />
          );
        })}

        {/* Dose markers */}
        {doseMarkers.map((m, i) => {
          if (m.time < startTime || m.time > endTime) return null;
          return (
            <circle key={`dose-${i}`}
              cx={xScale(m.time)} cy={yScale(m.mg > 0 ? m.mg : 0) - 2}
              r={4} fill={SUBSTANCE_COLORS[m.substance]} stroke="var(--color-surface)" strokeWidth={1.5}
            />
          );
        })}

        {/* Hover line and tooltip */}
        {hoverInfo && (
          <>
            <line
              x1={hoverInfo.x} x2={hoverInfo.x}
              y1={PADDING.top} y2={PADDING.top + CHART_H}
              stroke="var(--color-text-muted)" strokeWidth={0.9} opacity={0.55}
            />
            <rect
              x={Math.min(hoverInfo.x + 8, SVG_WIDTH - 150)} y={PADDING.top + 4}
              width={140} height={16 + hoverInfo.vals.length * 16}
              rx={6} fill="var(--color-bg-dark)" opacity={0.92}
            />
            <text
              x={Math.min(hoverInfo.x + 14, SVG_WIDTH - 144)} y={PADDING.top + 16}
              fontSize={10} fill="var(--color-text-on-dark)"
            >
              {hoverInfo.time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
            </text>
            {hoverInfo.vals.map((v, i) => (
              <text key={v.substance}
                x={Math.min(hoverInfo.x + 14, SVG_WIDTH - 144)}
                y={PADDING.top + 32 + i * 16}
                fontSize={10} fill={SUBSTANCE_COLORS[v.substance]}
              >
                {SUBSTANCE_LABELS[v.substance]}: {v.mg}mg
              </text>
            ))}
          </>
        )}

        {/* Y-axis label */}
        <text
          x={10} y={PADDING.top + CHART_H / 2}
          textAnchor="middle" fontSize={10} fill="var(--color-text-muted)"
          transform={`rotate(-90, 10, ${PADDING.top + CHART_H / 2})`}
        >
          mg active
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 pb-3 pt-1">
        {substances.map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-xs">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: SUBSTANCE_COLORS[s] }} />
            <span style={{ color: "var(--color-obsidian)" }}>{SUBSTANCE_LABELS[s]}</span>
          </div>
        ))}
        {sleepTime != null && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#222123", opacity: 0.15 }} />
            <span style={{ color: "var(--color-obsidian)" }}>Sleep zone</span>
          </div>
        )}
      </div>
    </div>
  );
}
