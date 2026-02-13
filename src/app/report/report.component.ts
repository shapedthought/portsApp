import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../data.service';
import { PortMapping, MappedPorts } from '../services';
import { DiagramComponent } from '../diagram/diagram.component';

interface FlatMapping extends MappedPorts {
  sourceServer: string;
}

@Component({
    selector: 'app-report',
    imports: [RouterLink, CommonModule, FormsModule, DiagramComponent],
    providers: [],
    templateUrl: './report.component.html',
    styleUrl: './report.component.css'
})
export class ReportComponent implements OnInit {

  portMapping: PortMapping[] = [];
  searchTerm: string = '';
  selectedSourceServer: string = '';
  selectedProtocol: string = '';

  // View mode toggle
  viewMode: 'table' | 'diagram' = 'table';

  // Pre-computed properties
  totalMappings = 0;
  filteredMappings: FlatMapping[] = [];
  uniqueSourceServers: string[] = [];
  uniqueProtocols: string[] = [];
  protocolCounts: Map<string, number> = new Map();
  serverMappingCounts: Map<string, number> = new Map();

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit(): void {
    this.dataService.loadPortMapping();
    this.portMapping = this.dataService.getMappedPorts();
    this.recomputeStats();
  }

  // Recompute all derived stats from current data + filters
  recomputeStats(): void {
    const allMappings = this.getFlatMappings();
    this.totalMappings = allMappings.length;

    // Unique servers (from raw data, not filtered)
    this.uniqueSourceServers = [...new Set(this.portMapping.map(item => item.sourceServer))].sort();

    // Unique protocols (from all mappings)
    this.uniqueProtocols = [...new Set(allMappings.map(m => m.protocol))].sort();

    // Protocol counts
    this.protocolCounts = new Map();
    for (const m of allMappings) {
      this.protocolCounts.set(m.protocol, (this.protocolCounts.get(m.protocol) || 0) + 1);
    }

    // Server mapping counts
    this.serverMappingCounts = new Map();
    for (const m of allMappings) {
      this.serverMappingCounts.set(m.sourceServer, (this.serverMappingCounts.get(m.sourceServer) || 0) + 1);
    }

    // Filtered mappings
    this.filteredMappings = this.computeFilteredMappings(allMappings);
  }

  private getFlatMappings(): FlatMapping[] {
    const flatMappings: FlatMapping[] = [];
    this.portMapping.forEach(item => {
      item.mappedPorts.forEach(target => {
        flatMappings.push({
          ...target,
          sourceServer: item.sourceServer
        });
      });
    });
    return flatMappings;
  }

  private computeFilteredMappings(mappings: FlatMapping[]): FlatMapping[] {
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      mappings = mappings.filter(mapping =>
        mapping.sourceServer.toLowerCase().includes(searchLower) ||
        mapping.targetServerName.toLowerCase().includes(searchLower) ||
        mapping.product.toLowerCase().includes(searchLower) ||
        mapping.sourceService.toLowerCase().includes(searchLower) ||
        mapping.targetService.toLowerCase().includes(searchLower) ||
        mapping.port.toString().includes(searchLower) ||
        mapping.protocol.toLowerCase().includes(searchLower)
      );
    }

    if (this.selectedSourceServer) {
      mappings = mappings.filter(mapping =>
        mapping.sourceServer === this.selectedSourceServer
      );
    }

    if (this.selectedProtocol) {
      mappings = mappings.filter(mapping =>
        mapping.protocol === this.selectedProtocol
      );
    }

    return mappings;
  }

  // Clear all filters
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedSourceServer = '';
    this.selectedProtocol = '';
    this.recomputeStats();
  }

  // Export report data
  exportReport(): void {
    const csvData = this.convertToCSV(this.filteredMappings);
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

}
