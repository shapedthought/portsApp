import dagre from '@dagrejs/dagre';

export const NODE_WIDTH = 172;
export const NODE_HEIGHT = 58;

export interface Point {
  x: number;
  y: number;
}

export interface EdgeGeometry {
  /** SVG path: a cubic Bézier from source centre to target centre. */
  d: string;
  /** Where the label sits: on the curve, as near its middle as it can be without overlapping. */
  mid: Point;
  /** Drawn right to left, so the label names the source. */
  reverse: boolean;
}

export interface MapLayout {
  width: number;
  height: number;
  nodes: Map<string, Point>;
  edges: Map<string, EdgeGeometry>;
}

interface EdgeInput {
  id: string;
  source: string;
  target: string;
  /** Label text after the direction arrow, used to estimate its width. */
  labelText?: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MARGIN = 40;
const LABEL_HEIGHT = 24;
/** Monospace 12px advance is 0.6em; plus padding, border and the two 6px gaps. */
const LABEL_CHAR_WIDTH = 7.2;
const LABEL_CHROME = 30;
/** Positions along a curve to try for its label, nearest the middle first. */
const LABEL_STEPS = [0.5, 0.4, 0.6, 0.32, 0.68, 0.25, 0.75];

type Curve = [Point, Point, Point, Point];

function pointAt([p0, c1, c2, p3]: Curve, t: number): Point {
  const u = 1 - t;
  const f = (k: 'x' | 'y') => u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p3[k];
  return { x: f('x'), y: f('y') };
}

function overlaps(a: Box, b: Box): boolean {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w + 8 && Math.abs(a.y - b.y) * 2 < a.h + b.h + 4;
}

/**
 * Centre-to-centre Bézier. Left-to-right edges are S-curves; right-to-left edges leave the source's
 * left side and bow under the whole graph; same-column edges bow out past its right edge.
 */
function curve(a: Point, b: Point, bounds: { bottom: number; right: number }): { curve: Curve; reverse: boolean } {
  const dx = b.x - a.x;
  if (dx > NODE_WIDTH / 2) {
    const mx = (a.x + b.x) / 2;
    return { curve: [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b], reverse: false };
  }
  if (dx < -NODE_WIDTH / 2) {
    // Leave from the source's left side so the curve clears other servers in the source's column.
    const start = { x: a.x - NODE_WIDTH / 2, y: a.y };
    const dip = bounds.bottom + 90;
    return { curve: [start, { x: start.x - 40, y: dip }, { x: b.x + 40, y: dip }, b], reverse: true };
  }
  const bulge = bounds.right + 120;
  return { curve: [a, { x: bulge, y: a.y }, { x: bulge, y: b.y }, b], reverse: false };
}

/** The direction marker shown before the label text; reversed edges name their source. */
export function edgeDirection(source: string, reverse: boolean): string {
  return reverse ? `← ${source}` : '→';
}

/** Left-to-right layered layout, sources on the left. */
export function layoutMap(nodeNames: string[], edges: EdgeInput[]): MapLayout {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 44, ranksep: 260, marginx: MARGIN, marginy: MARGIN });
  g.setDefaultEdgeLabel(() => ({}));
  nodeNames.forEach(name => g.setNode(name, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const nodes = new Map<string, Point>();
  nodeNames.forEach(name => {
    const n = g.node(name);
    nodes.set(name, { x: n.x, y: n.y });
  });

  const occupied: Box[] = [...nodes.values()].map(p => ({ x: p.x, y: p.y, w: NODE_WIDTH, h: NODE_HEIGHT }));
  const bounds = {
    bottom: Math.max(0, ...occupied.map(b => b.y + b.h / 2)),
    right: Math.max(0, ...occupied.map(b => b.x + b.w / 2)),
  };

  let width = g.graph().width ?? 0;
  let height = g.graph().height ?? 0;
  const geometry = new Map<string, EdgeGeometry>();
  edges.forEach(e => {
    const a = nodes.get(e.source);
    const b = nodes.get(e.target);
    if (!a || !b) return;
    const { curve: c, reverse } = curve(a, b, bounds);
    const chars = edgeDirection(e.source, reverse).length + (e.labelText ?? '').length;
    const w = chars * LABEL_CHAR_WIDTH + LABEL_CHROME;
    const candidates = LABEL_STEPS.map(t => ({ ...pointAt(c, t), w, h: LABEL_HEIGHT }));
    const box = candidates.find(cand => !occupied.some(o => overlaps(cand, o))) ?? candidates[0];
    occupied.push(box);
    geometry.set(e.id, {
      d: `M${c[0].x},${c[0].y} C${c[1].x},${c[1].y} ${c[2].x},${c[2].y} ${c[3].x},${c[3].y}`,
      mid: { x: box.x, y: box.y },
      reverse,
    });
    // Bowed curves reach outside the node area, so grow the canvas to their furthest point.
    const far = pointAt(c, 0.5);
    width = Math.max(width, box.x + w / 2 + MARGIN, far.x + MARGIN);
    height = Math.max(height, box.y + LABEL_HEIGHT / 2 + MARGIN, far.y + MARGIN);
  });

  return { width, height, nodes, edges: geometry };
}
