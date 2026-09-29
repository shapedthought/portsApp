import { Component, computed, inject, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { LucideAngularModule, Pencil, Trash2, Type } from 'lucide-angular';
import { MessageService } from 'primeng/api';
import { PortRow, ServerInfo, protocolsOf } from '../topology';
import { WorkspaceService } from '../workspace.service';

/** Right-hand panel shared by Dashboard and Map: the selected server's ports, or one connection's. */
@Component({
  selector: 'app-server-detail',
  imports: [LucideAngularModule, NgTemplateOutlet],
  templateUrl: './server-detail.component.html',
  styleUrl: './server-detail.component.css',
})
export class ServerDetailComponent {
  readonly ws = inject(WorkspaceService);
  private readonly messageService = inject(MessageService);

  readonly rename = output<ServerInfo>();
  readonly edit = output<ServerInfo>();
  readonly remove = output<ServerInfo>();

  readonly icons = { Pencil, Trash2, Type };

  readonly detail = this.ws.detail;

  private readonly rows = computed<PortRow[]>(() => {
    const d = this.detail();
    if (d.kind === 'node') return d.groups.flatMap(g => g.rows);
    if (d.kind === 'edge') return d.edge.rows;
    return [];
  });

  /** Comma-separated port lists for pasting into firewall rules. */
  readonly firewallPorts = computed(() => {
    const collect = (proto: string) => [
      ...new Set(
        this.rows()
          .filter(r => protocolsOf(r.protocol).includes(proto))
          .flatMap(r => r.ports.map(p => p.replace('–', '-'))),
      ),
    ].join(',');
    return { tcp: collect('TCP'), udp: collect('UDP') };
  });

  copyPorts(protocol: 'TCP' | 'UDP'): void {
    const ports = protocol === 'TCP' ? this.firewallPorts().tcp : this.firewallPorts().udp;
    navigator.clipboard.writeText(ports).then(
      () => this.messageService.add({ severity: 'success', summary: `${protocol} ports copied`, detail: ports }),
      () => this.messageService.add({ severity: 'error', summary: 'Copy failed', detail: 'Clipboard access was blocked by the browser.' }),
    );
  }
}
