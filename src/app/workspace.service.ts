import { Injectable, computed, inject, signal } from '@angular/core';
import { DataService } from './data.service';
import {
  Direction,
  Edge,
  PeerGroup,
  ProtocolFilter,
  Selection,
  ServerInfo,
  buildEdges,
  buildServers,
  buildStats,
  peerGroups,
} from './topology';

export type Mode = 'dash' | 'map';

export type Detail =
  | { kind: 'node'; server: ServerInfo; groups: PeerGroup[] }
  | { kind: 'edge'; edge: Edge }
  | { kind: 'none' };

/** UI state shared by the Dashboard and Map modes, so the selection survives switching between them. */
@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly data = inject(DataService);

  readonly mode = signal<Mode>('dash');
  readonly direction = signal<Direction>('out');
  readonly protocolFilter = signal<ProtocolFilter>('ALL');
  readonly showPortNumbers = signal(true);
  /** null means "default to the first server". */
  private readonly requested = signal<Selection | null>(null);

  readonly servers = computed(() => buildServers(this.data.mappedPorts()));
  readonly configuredServers = computed(() => this.servers().filter(s => s.id !== null));
  readonly edges = computed(() => buildEdges(this.data.mappedPorts()));
  readonly stats = computed(() => buildStats(this.data.mappedPorts(), this.edges()));

  /** The requested selection, corrected for the mode and for servers or connections that no longer exist. */
  readonly selection = computed<Selection>(() => {
    const first = this.configuredServers()[0] ?? this.servers()[0];
    const fallback: Selection = first ? { type: 'node', id: first.name } : { type: 'none' };
    const sel = this.requested();
    if (!sel) return fallback;
    if (sel.type === 'node') return this.servers().some(s => s.name === sel.id) ? sel : fallback;
    // Dashboard mode always keeps a server selected.
    if (this.mode() === 'dash') return fallback;
    if (sel.type === 'edge') return this.edges().some(e => e.id === sel.id) ? sel : { type: 'none' };
    return sel;
  });

  readonly detail = computed<Detail>(() => {
    const sel = this.selection();
    if (sel.type === 'node') {
      const server = this.servers().find(s => s.name === sel.id)!;
      return { kind: 'node', server, groups: peerGroups(this.data.mappedPorts(), sel.id, this.direction()) };
    }
    if (sel.type === 'edge') {
      return { kind: 'edge', edge: this.edges().find(e => e.id === sel.id)! };
    }
    return { kind: 'none' };
  });

  select(selection: Selection): void {
    this.requested.set(selection);
  }
}
