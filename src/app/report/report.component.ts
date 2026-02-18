import { Component, OnInit, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../data.service';
import { PortMapping, MappedPorts } from '../services';
import { DiagramComponent } from '../diagram/diagram.component';
import { TableModule, Table } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { MessageService, ConfirmationService } from 'primeng/api';

interface FlatMapping extends MappedPorts {
  sourceServer: string;
}

@Component({
    selector: 'app-report',
    imports: [RouterLink, FormsModule, DiagramComponent, TableModule, InputText],
    providers: [],
    templateUrl: './report.component.html',
    styleUrl: './report.component.css'
})
export class ReportComponent implements OnInit {

  @ViewChild('dt') dt!: Table;

  portMapping: PortMapping[] = [];
  flatMappings: FlatMapping[] = [];

  // View mode toggle
  viewMode: 'table' | 'diagram' = 'table';

  // Stats (precomputed)
  uniqueServers: string[] = [];
  uniqueProtocols: string[] = [];
  protocolCounts: Map<string, number> = new Map();
  serverMappingCounts: Map<string, number> = new Map();

  constructor(
    private dataService: DataService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit(): void {
    this.dataService.loadPortMapping();
    this.portMapping = this.dataService.mappedPorts();
    this.buildFlatMappings();
    this.buildStats();
  }

  private buildFlatMappings(): void {
    this.flatMappings = [];
    this.portMapping.forEach(item => {
      item.mappedPorts.forEach(target => {
        this.flatMappings.push({
          ...target,
          sourceServerId: item.id,
          sourceServer: item.sourceServer
        });
      });
    });
  }

  private buildStats(): void {
    const servers = new Set<string>();
    const protocols = new Set<string>();
    this.protocolCounts.clear();
    this.serverMappingCounts.clear();

    this.flatMappings.forEach(m => {
      servers.add(m.sourceServer);
      protocols.add(m.protocol);
      this.protocolCounts.set(m.protocol, (this.protocolCounts.get(m.protocol) || 0) + 1);
      this.serverMappingCounts.set(m.sourceServer, (this.serverMappingCounts.get(m.sourceServer) || 0) + 1);
    });

    this.uniqueServers = Array.from(servers).sort();
    this.uniqueProtocols = Array.from(protocols).sort();
  }

  clearGlobalFilter(table: Table, input: HTMLInputElement): void {
    table.clear();
    input.value = '';
  }

  // Export report data (uses filtered data if filters are active)
  exportReport(): void {
    const dataToExport = this.dt?.filteredValue ?? this.flatMappings;
    const csvData = this.convertToCSV(dataToExport);
    this.downloadCSV(csvData, 'port-mappings-report.csv');
  }

  private convertToCSV(data: FlatMapping[]): string {
    const headers = ['Source Server', 'Target Server', 'Product', 'Source Service', 'Target Service', 'Port', 'Protocol'];
    const csvRows = [headers.join(',')];

    data.forEach(mapping => {
      const row = [
        mapping.sourceServer,
        mapping.targetServerName,
        mapping.product,
        mapping.sourceService,
        mapping.targetService,
        mapping.port.toString(),
        mapping.protocol
      ].map(field => `"${field}"`);
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  private downloadCSV(csvData: string, filename: string): void {
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Toggle between table and diagram view
  toggleView(mode: 'table' | 'diagram'): void {
    this.viewMode = mode;
  }

  // Delete a specific port mapping entry
  deleteMapping(mapping: FlatMapping): void {
    this.confirmationService.confirm({
      header: 'Delete Port Mapping',
      message: `Delete "${mapping.sourceService} → ${mapping.targetService}" (${mapping.port} ${mapping.protocol}) from ${mapping.sourceServer}?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const deleted = this.dataService.deleteMappedPort(mapping.sourceServerId, mapping);
        if (deleted) {
          this.portMapping = this.dataService.mappedPorts();
          this.buildFlatMappings();
          this.buildStats();
          this.messageService.add({
            severity: 'success',
            summary: 'Mapping Deleted',
            detail: `Removed ${mapping.port} ${mapping.protocol} mapping from "${mapping.sourceServer}".`
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Mapping Not Found',
            detail: `No matching mapping found for ${mapping.port} ${mapping.protocol} on "${mapping.sourceServer}".`
          });
        }
      }
    });
  }

}
