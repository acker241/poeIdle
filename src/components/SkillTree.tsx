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
  groups: Array<{
    id: string;
    x: number;
    y: number;
    orbits: number[];
    nodeIds: string[];
  }>;
  constants: {
    skillsPerOrbit: number[];
    orbitRadii: number[];
    totalPoints: number;
    ascendancyPoints: number;
  };
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface SkillTreeProps {
  characterClass?: string;
  onAllocate?: (nodeIds: string[]) => void;
}

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

const BG_COLOR = "#0c0c0e";
const CONNECTION_COLOR = "#333333";
const ALLOCATED_CONNECTION_COLOR = "#c9a84c";

interface NodeStyle {
  radius: number;
  fill: string;
  stroke: string;
  allocatedFill: string;
  allocatedStroke: string;
}

// Base screen-space pixel sizes — scaled dynamically by zoom level
const NODE_STYLES: Record<string, NodeStyle> = {
  small:              { radius: 3,  fill: "#555555", stroke: "#888888", allocatedFill: "#b0a070", allocatedStroke: "#e0d0a0" },
  notable:            { radius: 5,  fill: "#997a3d", stroke: "#c9a84c", allocatedFill: "#d4af37", allocatedStroke: "#ffe066" },
  keystone:           { radius: 7,  fill: "#5c3d99", stroke: "#8b6cc5", allocatedFill: "#9b6ed8", allocatedStroke: "#c9a8f0" },
  mastery:            { radius: 3,  fill: "#333333", stroke: "#666666", allocatedFill: "#888888", allocatedStroke: "#bbbbbb" },
  jewel_socket:       { radius: 4,  fill: "#2d5a27", stroke: "#4a8c41", allocatedFill: "#4daa3d", allocatedStroke: "#7ddf6a" },
  class_start:        { radius: 8,  fill: "#1a4a6e", stroke: "#3498db", allocatedFill: "#3498db", allocatedStroke: "#6fc0f0" },
  ascendancy_small:   { radius: 3,  fill: "#6e1a1a", stroke: "#993333", allocatedFill: "#cc4444", allocatedStroke: "#ff7777" },
  ascendancy_notable: { radius: 5,  fill: "#8b1a1a", stroke: "#cc3333", allocatedFill: "#ee5555", allocatedStroke: "#ff9999" },
  ascendancy_start:   { radius: 4,  fill: "#6e1a1a", stroke: "#993333", allocatedFill: "#cc4444", allocatedStroke: "#ff7777" },
};

/** Compute zoom-dependent multiplier for node sizes.
 *  At fitScale (~0.03) nodes are tiny dots, at high zoom they're full size. */
function getNodeScale(zoom: number): number {
  // Ranges from 0.4 (overview) to 2.5 (zoomed in)
  const t = Math.min(1, Math.max(0, (zoom - 0.01) / 0.15));
  return 0.4 + t * 2.1;
}

const DEFAULT_STYLE: NodeStyle = NODE_STYLES.small;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNodeStyle(type: string): NodeStyle {
  return NODE_STYLES[type] ?? DEFAULT_STYLE;
}

/** Find a node under the given screen-space coordinates. */
function hitTest(
  screenX: number,
  screenY: number,
  nodes: ProcessedNode[],
  scale: number,
  offsetX: number,
  offsetY: number,
): ProcessedNode | null {
  const ns = getNodeScale(scale);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const style = getNodeStyle(n.type);
    const sx = n.x * scale + offsetX;
    const sy = n.y * scale + offsetY;
    const dx = screenX - sx;
    const dy = screenY - sy;
    const hitRadius = style.radius * ns + 3;
    if (dx * dx + dy * dy <= hitRadius * hitRadius) {
      return n;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SkillTree({ characterClass, onAllocate }: SkillTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Data
  const [treeData, setTreeData] = useState<ProcessedTree | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lookup map for quick id -> node
  const nodeMapRef = useRef<Map<string, ProcessedNode>>(new Map());

  // Interaction state stored in refs to avoid re-renders during pan/zoom
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(0.15);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // State that triggers React re-renders
  const [allocatedNodes, setAllocatedNodes] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<ProcessedNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Track whether a render is needed
  const needsRenderRef = useRef(true);
  const rafIdRef = useRef<number>(0);

  // Store latest allocated set in ref so canvas render loop can access it
  const allocatedRef = useRef<Set<string>>(allocatedNodes);
  allocatedRef.current = allocatedNodes;

  // Store hovered node id in ref for the render loop
  const hoveredIdRef = useRef<string | null>(null);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    fetch("/data/processed/skill-tree.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: ProcessedTree) => {
        if (cancelled) return;

        // Build lookup map
        const map = new Map<string, ProcessedNode>();
        for (const n of data.nodes) {
          map.set(n.id, n);
        }
        nodeMapRef.current = map;

        setTreeData(data);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------------------------------------
  // Centering on load
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!treeData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    const b = treeData.bounds;

    // Center on the whole tree
    const centerX = (b.minX + b.maxX) / 2;
    const centerY = (b.minY + b.maxY) / 2;

    // Calculate scale to fit whole tree in view (CSS pixels)
    const treeWidth = b.maxX - b.minX;
    const treeHeight = b.maxY - b.minY;
    const scaleX = cssW / treeWidth;
    const scaleY = cssH / treeHeight;
    const fitScale = Math.min(scaleX, scaleY) * 0.85;

    scaleRef.current = fitScale;
    offsetRef.current = {
      x: cssW / 2 - centerX * fitScale,
      y: cssH / 2 - centerY * fitScale,
    };

    needsRenderRef.current = true;
  }, [treeData, characterClass]);

  // -----------------------------------------------------------------------
  // Canvas render
  // -----------------------------------------------------------------------

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const data = treeData;
    if (!canvas || !data) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // CSS pixel dimensions
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const scale = scaleRef.current;
    const ox = offsetRef.current.x;
    const oy = offsetRef.current.y;
    const allocated = allocatedRef.current;
    const hovId = hoveredIdRef.current;

    // Clear (full canvas buffer)
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // reset to DPR-scaled identity
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Determine visible bounds in world space (with padding)
    const pad = 500 / scale;
    const visMinX = -ox / scale - pad;
    const visMinY = -oy / scale - pad;
    const visMaxX = (w - ox) / scale + pad;
    const visMaxY = (h - oy) / scale + pad;

    // Pre-filter visible nodes
    const visibleNodes: ProcessedNode[] = [];
    for (const n of data.nodes) {
      if (n.x >= visMinX && n.x <= visMaxX && n.y >= visMinY && n.y <= visMaxY) {
        visibleNodes.push(n);
      }
    }

    const visibleIds = new Set(visibleNodes.map((n) => n.id));

    // --- Draw connections in world space ---
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    const connWidth = Math.max(1, 2 / scale); // thin lines in world space
    ctx.lineWidth = connWidth;
    ctx.strokeStyle = CONNECTION_COLOR;
    ctx.beginPath();
    for (const node of visibleNodes) {
      for (const connId of node.connections) {
        if (node.id > connId) continue;
        const target = nodeMapRef.current.get(connId);
        if (!target) continue;
        if (allocated.has(node.id) && allocated.has(connId)) continue;
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(target.x, target.y);
      }
    }
    ctx.stroke();

    // Allocated connections (gold)
    if (allocated.size > 0) {
      ctx.strokeStyle = ALLOCATED_CONNECTION_COLOR;
      ctx.lineWidth = Math.max(1.5, 3 / scale);
      ctx.beginPath();
      for (const node of visibleNodes) {
        if (!allocated.has(node.id)) continue;
        for (const connId of node.connections) {
          if (node.id > connId) continue;
          if (!allocated.has(connId)) continue;
          const target = nodeMapRef.current.get(connId);
          if (!target) continue;
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
        }
      }
      ctx.stroke();

      // Off-screen allocated connections
      ctx.beginPath();
      for (const node of visibleNodes) {
        if (!allocated.has(node.id)) continue;
        for (const connId of node.connections) {
          if (visibleIds.has(connId)) continue;
          if (!allocated.has(connId)) continue;
          const target = nodeMapRef.current.get(connId);
          if (!target) continue;
          if (node.id > connId) continue;
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
        }
      }
      ctx.stroke();
    }

    // --- Draw nodes in SCREEN SPACE (zoom-dependent sizes) ---
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ns = getNodeScale(scale);

    for (const node of visibleNodes) {
      const style = getNodeStyle(node.type);
      const isAlloc = allocated.has(node.id);
      const isHovered = node.id === hovId;

      const sx = node.x * scale + ox;
      const sy = node.y * scale + oy;

      const fill = isAlloc ? style.allocatedFill : style.fill;
      const stroke = isAlloc ? style.allocatedStroke : style.stroke;
      let r = style.radius * ns;
      if (isHovered) r *= 1.3;

      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.5, r), 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();

      // Only draw stroke when nodes are big enough
      if (r > 1.5) {
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.strokeStyle = isHovered ? "#ffffff" : stroke;
        ctx.stroke();
      }
    }

    // --- Node labels when zoomed in enough ---
    if (ns > 1.5) {
      const fontSize = Math.min(12, Math.max(7, ns * 4));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = "#ccc";
      ctx.textAlign = "center";
      for (const node of visibleNodes) {
        if (node.type === "notable" || node.type === "keystone") {
          const sx = node.x * scale + ox;
          const sy = node.y * scale + oy;
          const r = getNodeStyle(node.type).radius * ns;
          ctx.fillText(node.name, sx, sy + r + fontSize + 1);
        }
      }
    }

    ctx.restore();
  }, [treeData]);

  // -----------------------------------------------------------------------
  // Animation loop
  // -----------------------------------------------------------------------

  useEffect(() => {
    const loop = () => {
      if (needsRenderRef.current) {
        renderCanvas();
        needsRenderRef.current = false;
      }
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [renderCanvas]);

  // Request render when allocations change
  useEffect(() => {
    needsRenderRef.current = true;
  }, [allocatedNodes]);

  // -----------------------------------------------------------------------
  // Resize handling
  // -----------------------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      needsRenderRef.current = true;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    return () => observer.disconnect();
  }, []);

  // -----------------------------------------------------------------------
  // Mouse event helpers
  // -----------------------------------------------------------------------

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const scale = scaleRef.current;
    const ox = offsetRef.current.x;
    const oy = offsetRef.current.y;
    return {
      x: (screenX - ox) / scale,
      y: (screenY - oy) / scale,
    };
  }, []);

  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      isDraggingRef.current = false;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - lastMouseRef.current.x;
        const dy = ev.clientY - lastMouseRef.current.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          isDraggingRef.current = true;
        }
        offsetRef.current.x += dx;
        offsetRef.current.y += dy;
        lastMouseRef.current = { x: ev.clientX, y: ev.clientY };
        needsRenderRef.current = true;
      };

      const onUp = (ev: MouseEvent) => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);

        // If it was a click (not a drag), handle node allocation
        if (!isDraggingRef.current && treeData) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const cx = ev.clientX - rect.left;
          const cy = ev.clientY - rect.top;
          const node = hitTest(cx, cy, treeData.nodes, scaleRef.current, offsetRef.current.x, offsetRef.current.y);
          if (node && node.type !== "mastery") {
            setAllocatedNodes((prev) => {
              const next = new Set(prev);
              if (next.has(node.id)) {
                next.delete(node.id);
              } else {
                next.add(node.id);
              }
              if (onAllocate) {
                onAllocate(Array.from(next));
              }
              return next;
            });
          }
        }
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [treeData, onAllocate],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!treeData) return;
      const coords = getCanvasCoords(e);
      const node = hitTest(coords.x, coords.y, treeData.nodes, scaleRef.current, offsetRef.current.x, offsetRef.current.y);

      const prevId = hoveredIdRef.current;
      const newId = node?.id ?? null;

      if (prevId !== newId) {
        hoveredIdRef.current = newId;
        setHoveredNode(node);
        needsRenderRef.current = true;
      }

      if (node) {
        setTooltipPos({ x: e.clientX, y: e.clientY });
      }
    },
    [treeData, getCanvasCoords],
  );

  // Wheel handler stored as ref so the native event listener always sees the latest
  const handleWheelRef = useRef((e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldScale = scaleRef.current;
    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    let newScale = oldScale * zoomFactor;
    newScale = Math.max(0.01, Math.min(2.0, newScale));

    // Zoom toward the mouse cursor
    const ratio = newScale / oldScale;
    offsetRef.current.x = mouseX - (mouseX - offsetRef.current.x) * ratio;
    offsetRef.current.y = mouseY - (mouseY - offsetRef.current.y) * ratio;
    scaleRef.current = newScale;

    needsRenderRef.current = true;
  });

  // Attach wheel listener with { passive: false } so preventDefault() works in Chrome
  // Re-run when treeData loads to ensure canvas is mounted
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => handleWheelRef.current(e);
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => canvas.removeEventListener("wheel", handler);
  }, [treeData]);

  const handleMouseLeave = useCallback(() => {
    if (hoveredIdRef.current !== null) {
      hoveredIdRef.current = null;
      setHoveredNode(null);
      needsRenderRef.current = true;
    }
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        Failed to load skill tree: {error}
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-amber-500/60 border-t-transparent rounded-full animate-spin" />
          Loading skill tree...
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {hoveredNode && (
        <SkillTreeTooltip
          node={hoveredNode}
          x={tooltipPos.x}
          y={tooltipPos.y}
          allocated={allocatedNodes.has(hoveredNode.id)}
        />
      )}
    </div>
  );
}

export type { ProcessedTree, SkillTreeProps };
