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

const NODE_STYLES: Record<string, NodeStyle> = {
  small: {
    radius: 8,
    fill: "#555555",
    stroke: "#888888",
    allocatedFill: "#b0a070",
    allocatedStroke: "#e0d0a0",
  },
  notable: {
    radius: 12,
    fill: "#997a3d",
    stroke: "#c9a84c",
    allocatedFill: "#d4af37",
    allocatedStroke: "#ffe066",
  },
  keystone: {
    radius: 16,
    fill: "#5c3d99",
    stroke: "#8b6cc5",
    allocatedFill: "#9b6ed8",
    allocatedStroke: "#c9a8f0",
  },
  mastery: {
    radius: 10,
    fill: "#333333",
    stroke: "#666666",
    allocatedFill: "#888888",
    allocatedStroke: "#bbbbbb",
  },
  jewel_socket: {
    radius: 10,
    fill: "#2d5a27",
    stroke: "#4a8c41",
    allocatedFill: "#4daa3d",
    allocatedStroke: "#7ddf6a",
  },
  class_start: {
    radius: 20,
    fill: "#1a4a6e",
    stroke: "#3498db",
    allocatedFill: "#3498db",
    allocatedStroke: "#6fc0f0",
  },
  ascendancy_small: {
    radius: 8,
    fill: "#6e1a1a",
    stroke: "#993333",
    allocatedFill: "#cc4444",
    allocatedStroke: "#ff7777",
  },
  ascendancy_notable: {
    radius: 12,
    fill: "#8b1a1a",
    stroke: "#cc3333",
    allocatedFill: "#ee5555",
    allocatedStroke: "#ff9999",
  },
  ascendancy_start: {
    radius: 10,
    fill: "#6e1a1a",
    stroke: "#993333",
    allocatedFill: "#cc4444",
    allocatedStroke: "#ff7777",
  },
};

const DEFAULT_STYLE: NodeStyle = NODE_STYLES.small;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNodeStyle(type: string): NodeStyle {
  return NODE_STYLES[type] ?? DEFAULT_STYLE;
}

/** Find a node under the given world-space coordinates. */
function hitTest(
  worldX: number,
  worldY: number,
  nodes: ProcessedNode[],
): ProcessedNode | null {
  // Iterate in reverse so top-drawn nodes get priority
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const style = getNodeStyle(n.type);
    const dx = worldX - n.x;
    const dy = worldY - n.y;
    // Use a slightly larger hit radius for usability
    const hitRadius = style.radius + 4;
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

    // Find starting position: class start node or center of tree
    let centerX = 0;
    let centerY = 0;

    if (characterClass) {
      const cls = treeData.classes.find(
        (c) => c.name.toLowerCase() === characterClass.toLowerCase(),
      );
      if (cls?.startNodeId) {
        const startNode = nodeMapRef.current.get(cls.startNodeId);
        if (startNode) {
          centerX = startNode.x;
          centerY = startNode.y;
        }
      }
    }

    // If no class specified or not found, try Marauder or use bounds center
    if (centerX === 0 && centerY === 0) {
      const marauder = treeData.classes.find(
        (c) => c.name.toLowerCase() === "marauder",
      );
      if (marauder?.startNodeId) {
        const startNode = nodeMapRef.current.get(marauder.startNodeId);
        if (startNode) {
          centerX = startNode.x;
          centerY = startNode.y;
        }
      }
    }

    if (centerX === 0 && centerY === 0) {
      const b = treeData.bounds;
      centerX = (b.minX + b.maxX) / 2;
      centerY = (b.minY + b.maxY) / 2;
    }

    const scale = scaleRef.current;
    offsetRef.current = {
      x: canvas.width / 2 - centerX * scale,
      y: canvas.height / 2 - centerY * scale,
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

    const w = canvas.width;
    const h = canvas.height;
    const scale = scaleRef.current;
    const ox = offsetRef.current.x;
    const oy = offsetRef.current.y;
    const allocated = allocatedRef.current;
    const hovId = hoveredIdRef.current;

    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    // Determine visible bounds in world space (with padding)
    const pad = 200; // world-space padding
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

    // --- Draw connections ---
    // Unallocated connections first
    ctx.lineWidth = 2 / scale; // keep line width roughly constant on screen
    const minLineWidth = 1;
    if (ctx.lineWidth < minLineWidth) ctx.lineWidth = minLineWidth;

    ctx.strokeStyle = CONNECTION_COLOR;
    ctx.beginPath();
    for (const node of visibleNodes) {
      for (const connId of node.connections) {
        // Only draw each edge once: draw if this node's id < connId
        if (node.id > connId) continue;
        const target = nodeMapRef.current.get(connId);
        if (!target) continue;
        // Skip if both are allocated (drawn later in gold)
        if (allocated.has(node.id) && allocated.has(connId)) continue;
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(target.x, target.y);
      }
    }
    ctx.stroke();

    // Allocated connections (gold)
    if (allocated.size > 0) {
      ctx.strokeStyle = ALLOCATED_CONNECTION_COLOR;
      ctx.lineWidth = 3 / scale;
      if (ctx.lineWidth < minLineWidth) ctx.lineWidth = minLineWidth;
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
    }

    // --- Draw nodes ---
    // Batch by type to minimize state changes
    for (const node of visibleNodes) {
      const style = getNodeStyle(node.type);
      const isAlloc = allocated.has(node.id);
      const isHovered = node.id === hovId;

      const fill = isAlloc ? style.allocatedFill : style.fill;
      const stroke = isAlloc ? style.allocatedStroke : style.stroke;
      let r = style.radius;

      if (isHovered) {
        r *= 1.25;
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.strokeStyle = isHovered ? "#ffffff" : stroke;
      ctx.stroke();
    }

    // Draw connections to off-screen allocated neighbors (so gold edges don't disappear)
    // This is handled by the padding above, but add allocated nodes that are off-screen
    // but connected to on-screen allocated nodes
    if (allocated.size > 0) {
      ctx.strokeStyle = ALLOCATED_CONNECTION_COLOR;
      ctx.lineWidth = 3 / scale;
      if (ctx.lineWidth < minLineWidth) ctx.lineWidth = minLineWidth;
      ctx.beginPath();
      for (const node of visibleNodes) {
        if (!allocated.has(node.id)) continue;
        for (const connId of node.connections) {
          if (visibleIds.has(connId)) continue; // already drawn
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
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      // Adjust actual drawing dimensions to CSS pixels
      canvas.width = rect.width;
      canvas.height = rect.height;
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
          const world = screenToWorld(cx, cy);
          const node = hitTest(world.x, world.y, treeData.nodes);
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
    [treeData, screenToWorld, onAllocate],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!treeData) return;
      const coords = getCanvasCoords(e);
      const world = screenToWorld(coords.x, coords.y);
      const node = hitTest(world.x, world.y, treeData.nodes);

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
    [treeData, getCanvasCoords, screenToWorld],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldScale = scaleRef.current;
    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    let newScale = oldScale * zoomFactor;
    newScale = Math.max(0.05, Math.min(2.0, newScale));

    // Zoom toward the mouse cursor
    const ratio = newScale / oldScale;
    offsetRef.current.x = mouseX - (mouseX - offsetRef.current.x) * ratio;
    offsetRef.current.y = mouseY - (mouseY - offsetRef.current.y) * ratio;
    scaleRef.current = newScale;

    needsRenderRef.current = true;
  }, []);

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
        onWheel={handleWheel}
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
