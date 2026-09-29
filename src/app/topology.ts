import { MappedPorts, PortMapping } from './services';

/** Derived views over DataService port mappings, used by the dashboard, map and detail panel. */

export type Selection =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | { type: 'none' };

export type Direction = 'out' | 'in';
export type ProtocolFilter = 'ALL' | 'TCP' | 'UDP';

export interface ServerInfo {
  /** PortMapping UUID; null for a target that is referenced but not configured as a server. */
  id: string | null;
  name: string;
  out: number;
  in: number;
  targets: number;
  products: string[];
}

export interface PortRow {
  service: string;
  protocol: string;
  ports: string[];
}

export interface Edge {
  /** `${source}|${target}` */
  id: string;
  source: string;
  target: string;
  protocols: string[];
  protocolLabel: string;
  ports: string[];
  rows: PortRow[];
}

export interface PeerGroup {
  peer: string;
  portCount: number;
  rows: PortRow[];
}

export interface Stats {
  servers: number;
  connections: number;
  portMappings: number;
  tcp: number;
  udp: number;
}

/** Splits a port field such as "445, 135" or "2500-3300" into display chips. Ranges count as one. */
export function splitPorts(port: string): string[] {
  return (port ?? '')
    .split(',')
    .map(p => p.trim().replace(/\s*-\s*/, '–'))
    .filter(p => p.length > 0);
}

export function protocolsOf(protocol: string): string[] {
  const upper = (protocol ?? '').toUpperCase();
  return ['TCP', 'UDP'].filter(p => upper.includes(p));
}

function portCount(mappings: MappedPorts[]): number {
  return mappings.reduce((sum, mp) => sum + splitPorts(mp.port).length, 0);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/** Merges mappings that share a service and protocol, de-duplicating their ports. */
export function mergeRows(mappings: MappedPorts[]): PortRow[] {
  const rows = new Map<string, PortRow>();
  for (const mp of mappings) {
    const key = `${mp.targetService}\u0000${mp.protocol}`;
    const row = rows.get(key) ?? { service: mp.targetService, protocol: mp.protocol, ports: [] };
    row.ports = unique([...row.ports, ...splitPorts(mp.port)]);
    rows.set(key, row);
  }
  return [...rows.values()];
}

/** Every mapping paired with its owning server name (MappedPorts.sourceServerName can go stale on rename). */
function flatten(portMappings: PortMapping[]): { source: string; mp: MappedPorts }[] {
  return portMappings.flatMap(pm => pm.mappedPorts.map(mp => ({ source: pm.sourceServer, mp })));
}

export function buildServers(portMappings: PortMapping[]): ServerInfo[] {
  const all = flatten(portMappings);
  const info = (id: string | null, name: string): ServerInfo => {
    const outbound = all.filter(x => x.source === name).map(x => x.mp);
    const inbound = all.filter(x => x.mp.targetServerName === name).map(x => x.mp);
    return {
      id,
      name,
      out: portCount(outbound),
      in: portCount(inbound),
      targets: unique(outbound.map(mp => mp.targetServerName)).length,
      products: unique(outbound.map(mp => mp.product).filter(Boolean)),
    };
  };
  const configured = portMappings.map(pm => info(pm.id, pm.sourceServer));
  const names = new Set(configured.map(s => s.name));
  const orphans = unique(all.map(x => x.mp.targetServerName)).filter(n => !names.has(n));
  return [...configured, ...orphans.map(n => info(null, n))];
}

export function buildEdges(portMappings: PortMapping[]): Edge[] {
  const grouped = new Map<string, MappedPorts[]>();
  for (const { source, mp } of flatten(portMappings)) {
    const id = `${source}|${mp.targetServerName}`;
    grouped.set(id, [...(grouped.get(id) ?? []), mp]);
  }
  return [...grouped.entries()].map(([id, mappings]) => {
    const [source, target] = id.split('|');
    const protocols = unique(mappings.flatMap(mp => protocolsOf(mp.protocol)));
    return {
      id,
      source,
      target,
      protocols,
      protocolLabel: protocols.join('/') || mappings[0].protocol,
      ports: unique(mappings.flatMap(mp => splitPorts(mp.port))),
      rows: mergeRows(mappings),
    };
  });
}

/** Mappings to or from one server, grouped by the server on the other end. */
export function peerGroups(portMappings: PortMapping[], server: string, direction: Direction): PeerGroup[] {
  const groups = new Map<string, MappedPorts[]>();
  for (const { source, mp } of flatten(portMappings)) {
    const peer = direction === 'out'
      ? (source === server ? mp.targetServerName : null)
      : (mp.targetServerName === server ? source : null);
    if (peer !== null) groups.set(peer, [...(groups.get(peer) ?? []), mp]);
  }
  return [...groups.entries()].map(([peer, mappings]) => {
    const rows = mergeRows(mappings);
    return { peer, rows, portCount: rows.reduce((sum, r) => sum + r.ports.length, 0) };
  });
}

export function buildStats(portMappings: PortMapping[], edges: Edge[]): Stats {
  const all = flatten(portMappings).map(x => x.mp);
  const count = (proto: string) => portCount(all.filter(mp => protocolsOf(mp.protocol).includes(proto)));
  return {
    servers: portMappings.length,
    connections: edges.length,
    portMappings: portCount(all),
    tcp: count('TCP'),
    udp: count('UDP'),
  };
}

/** Label text for a map edge: the first three ports and a "+n" overflow, or a port count. */
export function edgeLabelText(ports: string[], showPortNumbers: boolean): string {
  if (!showPortNumbers) return `${ports.length} port${ports.length === 1 ? '' : 's'}`;
  return ports.length > 3 ? `${ports.slice(0, 3).join(' ')} +${ports.length - 3}` : ports.join(' ');
}
