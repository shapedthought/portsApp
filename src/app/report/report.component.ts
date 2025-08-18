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

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit(): void {
    this.dataService.loadPortMapping();
    this.portMapping = this.dataService.getMappedPorts();
  }

  // Get flattened array of all mappings for display
  getFlatMappings(): FlatMapping[] {
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

  // Get filtered mappings based on search and filters
  getFilteredMappings(): FlatMapping[] {
    let mappings = this.getFlatMappings();

    // Apply search filter
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

    // Apply source server filter
    if (this.selectedSourceServer) {
      mappings = mappings.filter(mapping => 
        mapping.sourceServer === this.selectedSourceServer
      );
    }

    // Apply protocol filter
    if (this.selectedProtocol) {
      mappings = mappings.filter(mapping => 
        mapping.protocol === this.selectedProtocol
      );
    }

    return mappings;
  }

  // Get total number of mappings
  getTotalMappings(): number {
    return this.getFlatMappings().length;
  }

  // Get unique source servers
  getUniqueSourceServers(): string[] {
    const servers = new Set<string>();
    this.portMapping.forEach(item => servers.add(item.sourceServer));
    return Array.from(servers).sort();
  }

  // Get unique protocols
  getUniqueProtocols(): string[] {
    const protocols = new Set<string>();
    this.getFlatMappings().forEach(mapping => protocols.add(mapping.protocol));
    return Array.from(protocols).sort();
  }

  // Get count for specific protocol
  getProtocolCount(protocol: string): number {
    return this.getFlatMappings().filter(mapping => mapping.protocol === protocol).length;
  }

  // Get mapping count for specific server
  getServerMappingCount(server: string): number {
    return this.getFlatMappings().filter(mapping => mapping.sourceServer === server).length;
  }

  // Clear all filters
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedSourceServer = '';
    this.selectedProtocol = '';
  }

  // Export report data
  exportReport(): void {
    const filteredData = this.getFilteredMappings();
    const csvData = this.convertToCSV(filteredData);
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
