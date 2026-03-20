import { useEffect, useRef, useState, useCallback } from "react";
import { SkillTreeTooltip } from "@/components/SkillTreeTooltip";
import type { ProcessedNode } from "@/components/SkillTreeTooltip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProcessedTree {
  nodes: ProcessedNode[];
  classes: Array<{
    name: string;
    classIndex: number;
    startNodeId: string | null;
    ascendancies: Array<{ id: string; name: string }>;
  }>;
  groups: Array<{ id: string; x: number; y: number; orbits: number[]; nodeIds: string[] }>;
  constants: { skillsPerOrbit: number[]; orbitRadii: number[]; totalPoints: number; ascendancyPoints: number };
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface SkillTreeProps {
  characterClass?: string;
  onAllocate?: (nodeIds: string[]) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BG = "#0c0c0e";
const CONN_COLOR = "#444";
const CONN_ALLOC_COLOR = "#c9a84c";

// Screen-pixel radii per node type
const RADII: Record<string, number> = {
  small: 3, notable: 5, keystone: 7, mastery: 3, jewel_socket: 4,
  class_start: 8, ascendancy_small: 3, ascendancy_notable: 5, ascendancy_start: 4,
};
const FILLS: Record<string, string> = {
  small: "#666", notable: "#b8942e", keystone: "#7b50c4", mastery: "#444",
  jewel_socket: "#3a7a33", class_start: "#2980b9", ascendancy_small: "#992222",
  ascendancy_notable: "#bb2222", ascendancy_start: "#992222",
};
const ALLOC_FILLS: Record<string, string> = {
  small: "#c8b868", notable: "#e8c838", keystone: "#a878e8", mastery: "#999",
  jewel_socket: "#5cbf50", class_start: "#4db8e8", ascendancy_small: "#dd5555",
  ascendancy_notable: "#ee5555", ascendancy_start: "#dd5555",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function w2s(wx: number, wy: number, s: number, ox: number, oy: number) {
  return [wx * s + ox, wy * s + oy] as const;
}

/** Zoom-dependent radius multiplier: 0.5x at overview → 3x zoomed in */
function nodeMul(scale: number, fitScale: number): number {
  const ratio = scale / fitScale;
  // ratio 1 = overview, higher = zoomed in
  return Math.min(3, Math.max(0.5, 0.5 + (ratio - 1) * 0.3));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SkillTree({ characterClass, onAllocate }: SkillTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [treeData, setTreeData] = useState<ProcessedTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nodeMapRef = useRef<Map<string, ProcessedNode>>(new Map());

  // View state (mutable for perf)
  const oxRef = useRef(0);
  const oyRef = useRef(0);
  const scaleRef = useRef(0.05);
  const fitScaleRef = useRef(0.05);
  const rafRef = useRef(0);
  const centeredRef = useRef(false);

  // Interaction
  const [allocated, setAllocated] = useState<Set<string>>(new Set());
  const allocRef = useRef<Set<string>>(new Set());
  allocRef.current = allocated;
  const [hovered, setHovered] = useState<ProcessedNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const hovIdRef = useRef<string | null>(null);
  const dragRef = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // -----------------------------------------------------------------------
  // Load data
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    fetch("/data/processed/skill-tree.json")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: ProcessedTree) => {
        if (cancelled) return;
        const map = new Map<string, ProcessedNode>();
        for (const n of data.nodes) map.set(n.id, n);
        nodeMapRef.current = map;
        setTreeData(data);
      })
      .catch(e => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, []);

  // Centering is done inside render() on first frame with valid dimensions

  // -----------------------------------------------------------------------
  // Render loop
  // -----------------------------------------------------------------------
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const data = treeData;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    if (w < 10 || h < 10) return; // canvas not sized yet

    // Center on first valid frame
    if (!centeredRef.current) {
      const b = data.bounds;
      const tw = b.maxX - b.minX;
      const th = b.maxY - b.minY;
      if (tw > 0 && th > 0) {
        const cx = (b.minX + b.maxX) / 2;
        const cy = (b.minY + b.maxY) / 2;
        const fit = Math.min(w / tw, h / th) * 0.9;
        fitScaleRef.current = fit;
        scaleRef.current = fit;
        oxRef.current = w / 2 - cx * fit;
        oyRef.current = h / 2 - cy * fit;
        centeredRef.current = true;
      }
    }

    const s = scaleRef.current;
    if (s <= 0) return;
    const ox = oxRef.current;
    const oy = oyRef.current;
    const alloc = allocRef.current;
    const hovId = hovIdRef.current;
    const mul = nodeMul(s, fitScaleRef.current);

    // Reset transform and clear
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    // Visible bounds (CSS pixel coords → world)
    const margin = 50;
    const wMinX = (-ox - margin) / s;
    const wMinY = (-oy - margin) / s;
    const wMaxX = (w - ox + margin) / s;
    const wMaxY = (h - oy + margin) / s;

    // Filter visible nodes
    const vis: ProcessedNode[] = [];
    for (const n of data.nodes) {
      if (n.x >= wMinX && n.x <= wMaxX && n.y >= wMinY && n.y <= wMaxY) vis.push(n);
    }
    const visSet = new Set(vis.map(n => n.id));

    // --- Connections ---
    ctx.lineWidth = Math.max(0.5, mul * 0.4);

    // Unallocated
    ctx.strokeStyle = CONN_COLOR;
    ctx.beginPath();
    for (const n of vis) {
      const [x1, y1] = w2s(n.x, n.y, s, ox, oy);
      for (const cid of n.connections) {
        if (n.id > cid) continue;
        const t = nodeMapRef.current.get(cid);
        if (!t) continue;
        if (alloc.has(n.id) && alloc.has(cid)) continue;
        const [x2, y2] = w2s(t.x, t.y, s, ox, oy);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
    }
    ctx.stroke();

    // Allocated connections (gold)
    if (alloc.size > 0) {
      ctx.strokeStyle = CONN_ALLOC_COLOR;
      ctx.lineWidth = Math.max(1, mul * 0.8);
      ctx.beginPath();
      for (const n of vis) {
        if (!alloc.has(n.id)) continue;
        const [x1, y1] = w2s(n.x, n.y, s, ox, oy);
        for (const cid of n.connections) {
          if (n.id > cid) continue;
          if (!alloc.has(cid)) continue;
          const t = nodeMapRef.current.get(cid);
          if (!t) continue;
          const [x2, y2] = w2s(t.x, t.y, s, ox, oy);
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
      }
      ctx.stroke();
    }

    // --- Nodes ---
    for (const n of vis) {
      const [sx, sy] = w2s(n.x, n.y, s, ox, oy);
      const isA = alloc.has(n.id);
      const isH = n.id === hovId;
      const baseR = RADII[n.type] ?? 3;
      let r = baseR * mul;
      if (isH) r *= 1.4;
      r = Math.max(0.8, r);

      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = isA ? (ALLOC_FILLS[n.type] ?? "#c8b868") : (FILLS[n.type] ?? "#666");
      ctx.fill();

      if (r > 2) {
        ctx.lineWidth = isH ? 1.5 : 0.5;
        ctx.strokeStyle = isH ? "#fff" : "rgba(255,255,255,0.2)";
        ctx.stroke();
      }
    }

    // --- Labels (zoomed in) ---
    if (mul > 1.2) {
      const fs = Math.min(11, Math.max(7, mul * 3.5));
      ctx.font = `${fs}px sans-serif`;
      ctx.fillStyle = "#bbb";
      ctx.textAlign = "center";
      for (const n of vis) {
        if (n.type !== "notable" && n.type !== "keystone") continue;
        const [sx, sy] = w2s(n.x, n.y, s, ox, oy);
        const r = (RADII[n.type] ?? 5) * mul;
        ctx.fillText(n.name, sx, sy + r + fs + 1);
      }
    }
  }, [treeData]);

  // RAF loop — always renders (3337 nodes is fast enough)
  useEffect(() => {
    const loop = () => {
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  // -----------------------------------------------------------------------
  // Resize
  // -----------------------------------------------------------------------
  useEffect(() => {
    const c = containerRef.current;
    const cv = canvasRef.current;
    if (!c || !cv) return;
    const obs = new ResizeObserver(() => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cv.width = r.width * dpr;
      cv.height = r.height * dpr;
      cv.style.width = `${r.width}px`;
      cv.style.height = `${r.height}px`;
      /* render runs every frame */
    });
    obs.observe(c);
    // Initial size
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = r.width * dpr;
    cv.height = r.height * dpr;
    cv.style.width = `${r.width}px`;
    cv.style.height = `${r.height}px`;
    return () => obs.disconnect();
  }, []);

  // -----------------------------------------------------------------------
  // Hit test (screen space)
  // -----------------------------------------------------------------------
  const findNode = useCallback((cx: number, cy: number): ProcessedNode | null => {
    if (!treeData) return null;
    const s = scaleRef.current;
    const ox = oxRef.current;
    const oy = oyRef.current;
    const mul = nodeMul(s, fitScaleRef.current);
    for (let i = treeData.nodes.length - 1; i >= 0; i--) {
      const n = treeData.nodes[i];
      const [sx, sy] = w2s(n.x, n.y, s, ox, oy);
      const r = (RADII[n.type] ?? 3) * mul + 3;
      const dx = cx - sx, dy = cy - sy;
      if (dx * dx + dy * dy <= r * r) return n;
    }
    return null;
  }, [treeData]);

  // -----------------------------------------------------------------------
  // Mouse handlers
  // -----------------------------------------------------------------------
  const onDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = false;
    lastMouse.current = { x: e.clientX, y: e.clientY };

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - lastMouse.current.x;
      const dy = ev.clientY - lastMouse.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current = true;
      oxRef.current += dx;
      oyRef.current += dy;
      lastMouse.current = { x: ev.clientX, y: ev.clientY };
      /* render runs every frame */
    };

    const onUp = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (!dragRef.current) {
        const cv = canvasRef.current;
        if (!cv) return;
        const rect = cv.getBoundingClientRect();
        const node = findNode(ev.clientX - rect.left, ev.clientY - rect.top);
        if (node && node.type !== "mastery") {
          setAllocated(prev => {
            const next = new Set(prev);
            next.has(node.id) ? next.delete(node.id) : next.add(node.id);
            onAllocate?.(Array.from(next));
            return next;
          });
        }
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [findNode, onAllocate]);

  const onMove = useCallback((e: React.MouseEvent) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const node = findNode(cx, cy);
    if (node?.id !== hovIdRef.current) {
      hovIdRef.current = node?.id ?? null;
      setHovered(node);
      /* render runs every frame */
    }
    if (node) setTooltipPos({ x: e.clientX, y: e.clientY });
  }, [findNode]);

  // Wheel zoom
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = cv.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const old = scaleRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const next = Math.max(0.005, Math.min(2, old * factor));
      const ratio = next / old;
      oxRef.current = mx - (mx - oxRef.current) * ratio;
      oyRef.current = my - (my - oyRef.current) * ratio;
      scaleRef.current = next;
      /* render runs every frame */
    };
    cv.addEventListener("wheel", handler, { passive: false });
    return () => cv.removeEventListener("wheel", handler);
  }, [treeData]); // re-attach when tree loads

  const onLeave = useCallback(() => {
    if (hovIdRef.current) { hovIdRef.current = null; setHovered(null); }
  }, []);

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------
  if (error) return <div className="flex items-center justify-center h-full text-red-400 text-sm">Failed to load: {error}</div>;
  if (!treeData) return (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-amber-500/60 border-t-transparent rounded-full animate-spin" />
        Loading skill tree...
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      />
      {hovered && (
        <SkillTreeTooltip
          node={hovered}
          x={tooltipPos.x}
          y={tooltipPos.y}
          allocated={allocated.has(hovered.id)}
        />
      )}
    </div>
  );
}

export type { ProcessedTree, SkillTreeProps };
