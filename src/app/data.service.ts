import { Injectable } from '@angular/core';
import { PortMapping, Server } from './services';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  mappedPorts: PortMapping[] = [
    {
      id: 0,
      sourceServer: 'Server 1',
      totalMappedPorts: 0,
      totalMappedInboundPorts: 0,
      totalMappedServers: 0,
      mappedPorts: [],
    },
    {
      id: 1,
      sourceServer: 'Server 2',
      totalMappedPorts: 0,
      totalMappedInboundPorts: 0,
      totalMappedServers: 0,
      mappedPorts: [],
    },
  ];
  selectedService: string = 'VB365';

  updatedSelectedService(service: string): void {
    this.selectedService = service;
  }

  getSelectedService(): string {
    return this.selectedService;
  }

  savePortMapping(portMapping: PortMapping[]): void {
    localStorage.setItem('portMapping', JSON.stringify(portMapping));
  }

  loadPortMapping(): void {
    const portMappingStr = localStorage.getItem('portMapping');
    if (portMappingStr) {
      this.mappedPorts = JSON.parse(portMappingStr);
    }
  }

  deleteAll(): void {
    localStorage.removeItem('portMapping');
    this.mappedPorts = [
      {
        id: 0,
        sourceServer: 'Server 1',
        totalMappedPorts: 0,
        totalMappedInboundPorts: 0,
        totalMappedServers: 0,
        mappedPorts: [],
      },
      {
        id: 1,
        sourceServer: 'Server 2',
        totalMappedPorts: 0,
        totalMappedInboundPorts: 0,
        totalMappedServers: 0,
        mappedPorts: [],
      },
    ];;
  }
  
  // Upload port mapping data from JSON file
  uploadPortMapping(portMapping: PortMapping[]): void {
    this.mappedPorts = portMapping;
    this.savePortMapping(portMapping);
  }
  
  // Get the port mapping data
  getMappedPorts(): PortMapping[] {
    return this.mappedPorts;
  }

  // Delete a server from the port mapping
  deleteServer(index: number): void {
    const removedServer = this.mappedPorts.splice(index, 1);
    this.recalculateMappedPorts();
    // this.mappedPorts.forEach((portMapping) => {
    //   portMapping.mappedPorts = portMapping.mappedPorts.filter(
    //     (mappedPort) =>
    //       mappedPort.targetServerName !== removedServer[0].sourceServer
    //   );
    //   portMapping.totalMappedPorts = portMapping.mappedPorts.length;
    //   portMapping.totalMappedServers = Array.from(
    //     new Set(
    //       portMapping.mappedPorts.map(
    //         (mappedPort) => mappedPort.targetServerName
    //       )
    //     )
    //   ).length;
    //   portMapping.totalMappedInboundPorts = this.getTotalInboundPorts(portMapping.sourceServer);
    // });
    // this.savePortMapping(this.mappedPorts);
  }

  // Add a new server to the port mapping
  addNewServer(serverName: string): PortMapping[] {
    let id = this.mappedPorts.length;
    this.mappedPorts.push({
      id: id,
      sourceServer: serverName,
      totalMappedPorts: 0,
      totalMappedInboundPorts: 0,
      totalMappedServers: 0,
      mappedPorts: [],
    });
    this.savePortMapping(this.mappedPorts);
    return this.mappedPorts;
  }

  // Recalculate the mapped ports for each server
  recalculateMappedPorts(): void {
    this.mappedPorts.forEach((portMapping) => {
      let ports: string[]= [];
      portMapping.mappedPorts.map((mappedPort) => {
        if (mappedPort.port.includes(',')) {
          mappedPort.port.split(',').forEach((port) => {
            ports.push(port.trim());
          });
        } else {
          ports.push(mappedPort.port);
        }
        });
      portMapping.totalMappedPorts = Array.from(new Set(ports)).length;
      portMapping.totalMappedServers = Array.from(
        new Set(
          portMapping.mappedPorts.map((mappedPort) => mappedPort.targetServerName)
        )
      ).length;
      portMapping.totalMappedInboundPorts = this.getTotalInboundPorts(portMapping.sourceServer);
    });
    this.savePortMapping(this.mappedPorts);
  }

  // Get the total number of inbound ports for a server
  getTotalInboundPorts(serverName: string): number {
    let totalInboundPorts: string[] = [];
    this.mappedPorts.forEach((portMapping) => {
      portMapping.mappedPorts.forEach((mappedPort) => {
        if (mappedPort.targetServerName === serverName) {
          totalInboundPorts.push(mappedPort.port);
        }
      });
    });
    let splitPorts: string[] = [];
    totalInboundPorts.forEach((port) => {
      if (port.includes(',')) {
        port.split(',').forEach((splitPort) => {
          splitPorts.push(splitPort.trim());
        });
      } else {
        splitPorts.push(port);
      }
    });
    return Array.from(new Set(splitPorts)).length;
  }

  // Update the port mapping data
  updatePortMapping(portMapping: PortMapping, index: number): void {
    this.mappedPorts[index] = portMapping;
    this.recalculateMappedPorts();
    // this.mappedPorts[index].totalMappedPorts = Array.from(
    //   new Set(portMapping.mappedPorts.map((mappedPort) => mappedPort.port))
    // ).length;
    // this.mappedPorts[index].totalMappedServers = Array.from(
    //   new Set(
    //     portMapping.mappedPorts.map((mappedPort) => mappedPort.targetServerName)
    //   )
    // ).length;
    // this.mappedPorts[index].totalMappedInboundPorts = this.getTotalInboundPorts(portMapping.sourceServer);
    this.savePortMapping(this.mappedPorts);
  }

  // Get the servers from the port mapping data
  getServers(): Server[] {
    let serverStrings: string[] = [];
    let servers: Server[] = [];

    this.mappedPorts.forEach((portMapping) => {
      serverStrings.push(portMapping.sourceServer);
      portMapping.mappedPorts.forEach((mappedPort) => {
        serverStrings.push(mappedPort.targetServerName);
      });
    });

    serverStrings = Array.from(new Set(serverStrings));

    let id = 0;
    serverStrings.forEach((serverString) => {
      servers.push({ id: id, name: serverString });
      id++;
    });

    return servers;
  } 

  // Update the server name in the port mapping data
  updateName(newName: string, index: number) {
    const oldName = this.mappedPorts[index].sourceServer;
    this.mappedPorts.forEach((portMapping) => {
      portMapping.mappedPorts.forEach((mappedPort) => {
        if (mappedPort.targetServerName === oldName) {
          mappedPort.targetServerName = newName;
        }
      });
    });
    this.mappedPorts[index].sourceServer = newName;
    this.savePortMapping(this.mappedPorts);
  }

  constructor() {}
}
