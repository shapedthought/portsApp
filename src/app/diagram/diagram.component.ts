import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import mermaid from 'mermaid';
import { PortMapping, MappedPorts } from '../services';

interface PortGroup {
  protocol: 'TCP' | 'UDP';
  ports: string[];
  services: string[];
}

interface ServerConnection {
  source: string;
  target: string;
  portGroups: PortGroup[];
  totalConnections: number;
}

interface DiagramData {
  connections: ServerConnection[];
  servers: string[];
}

@Component({
  selector: 'app-diagram',
  imports: [CommonModule, FormsModule],
  templateUrl: './diagram.component.html',
  styleUrl: './diagram.component.css'
})
export class DiagramComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() portMappings: PortMapping[] = [];
  @ViewChild('mermaidContainer', { static: true }) mermaidContainer!: ElementRef;

  // Diagram state
  diagramData: DiagramData = { connections: [], servers: [] };
  mermaidSyntax: string = '';
  isLoading: boolean = false;
  
  // Display options
  layoutDirection: 'LR' | 'TD' | 'RL' | 'BT' = 'LR';
  showPortNumbers: boolean = true;
  showProtocols: boolean = true;
  compactMode: boolean = true;

  ngOnInit(): void {
    // Initialize Mermaid with our custom theme
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#6366f1',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#4f46e5',
        lineColor: '#6b7280',
        sectionBkgColor: '#f8fafc',
        altSectionBkgColor: '#f1f5f9',
        gridColor: '#e5e7eb',
        secondaryColor: '#10b981',
        tertiaryColor: '#f59e0b',
        background: '#ffffff',
        mainBkg: '#ffffff',
        secondBkg: '#f8fafc',
        tertiaryBkg: '#f1f5f9'
      }
    });

    this.processPortMappings();
  }

  ngAfterViewInit(): void {
    this.generateDiagram();
  }

  ngOnDestroy(): void {
    // Clean up any Mermaid resources if needed
  }

  // Process port mapping data into diagram format
  processPortMappings(): void {
    if (!this.portMappings || this.portMappings.length === 0) {
      this.diagramData = { connections: [], servers: [] };
      return;
    }

    const connections = new Map<string, ServerConnection>();
    const servers = new Set<string>();

    this.portMappings.forEach(mapping => {
      servers.add(mapping.sourceServer);
      
      mapping.mappedPorts.forEach(port => {
        servers.add(port.targetServerName);
        const key = `${mapping.sourceServer}->${port.targetServerName}`;
        
        if (!connections.has(key)) {
          connections.set(key, {
            source: mapping.sourceServer,
            target: port.targetServerName,
            portGroups: [],
            totalConnections: 0
          });
        }
        
        const connection = connections.get(key)!;
        this.addPortToConnection(connection, port);
      });
    });

    // Group ports by protocol for each connection
    connections.forEach(connection => {
      connection.portGroups = this.groupPortsByProtocol(connection);
      connection.totalConnections = connection.portGroups.reduce(
        (sum, group) => sum + group.ports.length, 0
      );
    });

    this.diagramData = {
      connections: Array.from(connections.values()),
      servers: Array.from(servers)
    };
  }

  // Add port to connection, collecting all ports first
  private addPortToConnection(connection: ServerConnection, port: MappedPorts): void {
    // Use connection object to temporarily store all ports before grouping
    if (!(connection as any).tempPorts) {
      (connection as any).tempPorts = [];
    }
    (connection as any).tempPorts.push(port);
  }

  // Group ports by protocol after all ports are collected
  private groupPortsByProtocol(connection: ServerConnection): PortGroup[] {
    const tempPorts = (connection as any).tempPorts || [];
    const protocolGroups = new Map<string, { ports: Set<string>, services: Set<string> }>();

    tempPorts.forEach((port: MappedPorts) => {
      if (!protocolGroups.has(port.protocol)) {
        protocolGroups.set(port.protocol, {
          ports: new Set<string>(),
          services: new Set<string>()
        });
      }

      const group = protocolGroups.get(port.protocol)!;
      
      // Handle port ranges and multiple ports
      const portStrings = this.parsePortString(port.port);
      portStrings.forEach(p => group.ports.add(p));
      group.services.add(port.targetService);
    });

    return Array.from(protocolGroups.entries()).map(([protocol, data]) => ({
      protocol: protocol as 'TCP' | 'UDP',
      ports: Array.from(data.ports).sort(this.portSortComparator),
      services: Array.from(data.services)
    }));
  }

  // Parse port string to handle ranges and multiple ports
  private parsePortString(portStr: string): string[] {
    if (!portStr) return [];
    
    return portStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
  }

  // Sort ports numerically
  private portSortComparator(a: string, b: string): number {
    const numA = parseInt(a);
    const numB = parseInt(b);
    
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  }

  // Generate Mermaid diagram syntax
  generateMermaidSyntax(): string {
    if (this.diagramData.connections.length === 0) {
      return `graph ${this.layoutDirection}\n    A[No Data Available] --> B[Add some port mappings to see the diagram]`;
    }

    let syntax = `graph ${this.layoutDirection}\n`;
    
    // Add styling classes
    syntax += this.generateMermaidStyles();
    
    // Generate node definitions with clean names
    const nodeMap = new Map<string, string>();
    this.diagramData.servers.forEach((server, index) => {
      const nodeId = `N${index}`;
      nodeMap.set(server, nodeId);
      syntax += `    ${nodeId}["${this.sanitizeNodeName(server)}"]\n`;
    });

    // Generate connections
    this.diagramData.connections.forEach(connection => {
      const sourceId = nodeMap.get(connection.source);
      const targetId = nodeMap.get(connection.target);
      
      if (sourceId && targetId) {
        const label = this.generateConnectionLabel(connection);
        const linkStyle = this.getConnectionStyle(connection);
        
        syntax += `    ${sourceId} ${linkStyle}|"${label}"| ${targetId}\n`;
      }
    });

    // Apply styling
    syntax += this.generateNodeStyling(nodeMap);

    return syntax;
  }

  // Generate connection label based on display options
  private generateConnectionLabel(connection: ServerConnection): string {
    if (!this.showProtocols && !this.showPortNumbers) {
      return `${connection.totalConnections} connections`;
    }

    const labels: string[] = [];
    
    connection.portGroups.forEach(group => {
      let label = '';
      
      if (this.showProtocols) {
        label += group.protocol;
      }
      
      if (this.showPortNumbers && group.ports.length > 0) {
        const portList = this.compactMode 
          ? this.compressPortList(group.ports)
          : group.ports.join(',');
        
        label += this.showProtocols ? `: ${portList}` : portList;
      }
      
      if (label) {
        labels.push(label);
      }
    });

    return labels.join('<br/>') || 'Connection';
  }

  // Compress port list for compact display
  private compressPortList(ports: string[]): string {
    if (ports.length <= 3) {
      return ports.join(',');
    }
    
    // For now, simple truncation - could implement range detection later
    return ports.slice(0, 3).join(',') + `... (+${ports.length - 3})`;
  }

  // Get connection style based on protocols
  private getConnectionStyle(connection: ServerConnection): string {
    const hasMultipleProtocols = connection.portGroups.length > 1;
    const totalPorts = connection.totalConnections;
    
    if (hasMultipleProtocols) {
      return totalPorts > 5 ? '===' : '-->';
    }
    
    const protocol = connection.portGroups[0]?.protocol;
    if (protocol === 'UDP') {
      return totalPorts > 3 ? '===>' : '-..->';
    }
    
    return totalPorts > 5 ? '===' : '-->';
  }

  // Sanitize server names for Mermaid
  private sanitizeNodeName(name: string): string {
    return name.replace(/['"]/g, '').substring(0, 20) + (name.length > 20 ? '...' : '');
  }

  // Generate Mermaid styling
  private generateMermaidStyles(): string {
    return `
    classDef serverNode fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#ffffff
    classDef tcpConnection stroke:#3b82f6,stroke-width:2px
    classDef udpConnection stroke:#10b981,stroke-width:2px
    classDef mixedConnection stroke:#8b5cf6,stroke-width:3px
    
`;
  }

  // Apply node styling
  private generateNodeStyling(nodeMap: Map<string, string>): string {
    let styling = '\n';
    nodeMap.forEach((nodeId) => {
      styling += `    class ${nodeId} serverNode\n`;
    });
    return styling;
  }

  // Generate and render the diagram
  async generateDiagram(): Promise<void> {
    if (!this.mermaidContainer) return;
    
    this.isLoading = true;
    this.mermaidSyntax = this.generateMermaidSyntax();
    
    try {
      // Clear previous diagram
      this.mermaidContainer.nativeElement.innerHTML = '';
      
      // Generate new diagram
      const { svg } = await mermaid.render('mermaid-diagram', this.mermaidSyntax);
      this.mermaidContainer.nativeElement.innerHTML = svg;
      
    } catch (error) {
      console.error('Error generating Mermaid diagram:', error);
      this.mermaidContainer.nativeElement.innerHTML = 
        '<p class="has-text-danger">Error generating diagram. Please check your data.</p>';
    } finally {
      this.isLoading = false;
    }
  }

  // Event handlers for controls
  onLayoutChange(): void {
    this.generateDiagram();
  }

  onDisplayOptionChange(): void {
    this.generateDiagram();
  }

  // Export functionality
  exportSVG(): void {
    const svgElement = this.mermaidContainer.nativeElement.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    this.downloadFile(blob, 'network-diagram.svg');
  }

  exportPNG(): void {
    const svgElement = this.mermaidContainer.nativeElement.querySelector('svg');
    if (!svgElement) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          this.downloadFile(blob, 'network-diagram.png');
        }
      }, 'image/png');
    };

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
    img.src = URL.createObjectURL(svgBlob);
  }

  copyMermaidCode(): void {
    navigator.clipboard.writeText(this.mermaidSyntax).then(() => {
      // Could add a success notification here
      console.log('Mermaid code copied to clipboard');
    });
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Getter for summary statistics
  get diagramStats(): { servers: number; connections: number; totalPorts: number } {
    return {
      servers: this.diagramData.servers.length,
      connections: this.diagramData.connections.length,
      totalPorts: this.diagramData.connections.reduce(
        (sum, conn) => sum + conn.totalConnections, 0
      )
    };
  }
}
