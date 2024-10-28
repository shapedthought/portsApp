import { Injectable } from '@angular/core';
import { MappedPorts, PortMapping, Server } from './services';

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
      allInboundPortsTcp: [],
      allInboundPortsUdp: [],
      allOutboundPortsTcp: [],
      allOutboundPortsUdp: [],
      mappedPortsByProtocol: [],
      mappedPortsByProtocolInbound: [],
    },
    {
      id: 1,
      sourceServer: 'Server 2',
      totalMappedPorts: 0,
      totalMappedInboundPorts: 0,
      totalMappedServers: 0,
      mappedPorts: [],
      allInboundPortsTcp: [],
      allInboundPortsUdp: [],
      allOutboundPortsTcp: [],
      allOutboundPortsUdp: [],
      mappedPortsByProtocol: [],
      mappedPortsByProtocolInbound: [],
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
        allInboundPortsTcp: [],
        allInboundPortsUdp: [],
        allOutboundPortsTcp: [],
        allOutboundPortsUdp: [],
        mappedPortsByProtocol: [],
        mappedPortsByProtocolInbound: [],
      },
      {
        id: 1,
        sourceServer: 'Server 2',
        totalMappedPorts: 0,
        totalMappedInboundPorts: 0,
        totalMappedServers: 0,
        mappedPorts: [],
        allInboundPortsTcp: [],
        allInboundPortsUdp: [],
        allOutboundPortsTcp: [],
        allOutboundPortsUdp: [],
        mappedPortsByProtocol: [],
        mappedPortsByProtocolInbound: [],
      },
    ];
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
    this.recalculateServerMapedPorts();
    this.recalculateMappedPorts();
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
      allOutboundPortsTcp: [],
      allOutboundPortsUdp: [],
      allInboundPortsTcp: [],
      allInboundPortsUdp: [],
      mappedPortsByProtocol: [],
      mappedPortsByProtocolInbound: [],
    });
    this.savePortMapping(this.mappedPorts);
    return this.mappedPorts;
  }

  recalculateServerMapedPorts(): void {
    const mapToProtocolArray = (map: Map<string, Set<string>>) => {
      let index = 0;
      return Array.from(map.entries()).map(([key, ports]) => {
        const [serverName, protocol] = key.split('-');
        return {
          index: index++,
          serverName,
          service: '',
          protocol,
          port: Array.from(ports).join(', '),
        };
      });
    };

    const reducePorts = (ports: MappedPorts[], keyFn: (port: MappedPorts) => string) => {
      return ports.reduce((acc, port) => {
        const key = keyFn(port);
        if (!acc.has(key)) {
          acc.set(key, new Set([port.port]));
        } else {
          acc.get(key)?.add(port.port);
        }
        return acc;
      }, new Map<string, Set<string>>());
    };

    this.mappedPorts.forEach((portMapping) => {
      const outboundPorts = reducePorts(portMapping.mappedPorts, (port: MappedPorts) => `${port.targetServerName}-${port.protocol}`);
      portMapping.mappedPortsByProtocol = mapToProtocolArray(outboundPorts);

      const inboundPorts = reducePorts(
        this.mappedPorts.flatMap((item) =>
          item.mappedPorts.filter(
            (mappedPort) => mappedPort.targetServerName === portMapping.sourceServer
          )
        ),
        (port) => `${port.sourceServerName}-${port.protocol}`
      );
      portMapping.mappedPortsByProtocolInbound = mapToProtocolArray(inboundPorts);
    });
  }

  // Recalculate the mapped ports for each server
  recalculateMappedPorts(): void {
    this.mappedPorts.forEach((portMapping) => {
      const ports = new Set<string>();
      const tcpPorts = new Set<string>();
      const udpPorts = new Set<string>();
      let portRange = 0;

      portMapping.mappedPorts.forEach(({ port, protocol }) => {
        const isTCP = protocol.includes('TCP');
        const isUDP = protocol.includes('UDP');

        if (port.includes(',')) {
          port.split(',').forEach((p) => {
            const trimmedPort = p.trim();
            ports.add(trimmedPort);
            if (isTCP) tcpPorts.add(trimmedPort);
            if (isUDP) udpPorts.add(trimmedPort);
          });
        } else if (port.includes('-')) {
          ports.add(port);
          if (isTCP) tcpPorts.add(port);
          if (isUDP) udpPorts.add(port);
          const [start, end] = port.split('-').map(Number);
          portRange += end - start;
        } else {
          ports.add(port);
          if (isTCP) tcpPorts.add(port);
          if (isUDP) udpPorts.add(port);
        }
      });

      portMapping.totalMappedPorts = ports.size + portRange;
      portMapping.totalMappedServers = new Set(
        portMapping.mappedPorts.map(({ targetServerName }) => targetServerName)
      ).size;

      const [portQty, tcpPortsIn, udpPortsIn] = this.getTotalInboundPorts(portMapping.sourceServer);
      portMapping.totalMappedInboundPorts = portQty;
      portMapping.allOutboundPortsTcp = Array.from(tcpPorts);
      portMapping.allOutboundPortsUdp = Array.from(udpPorts);
      portMapping.allInboundPortsTcp = tcpPortsIn;
      portMapping.allInboundPortsUdp = udpPortsIn;
    });

    this.savePortMapping(this.mappedPorts);
  }

  // Get the total number of inbound ports for a server
  getTotalInboundPorts(serverName: string): [number, string[], string[]] {
    const totalInboundPorts = new Set<string>();
    const tcpPorts = new Set<string>();
    const udpPorts = new Set<string>();
    let portRange = 0;

    this.mappedPorts.forEach((portMapping) => {
      portMapping.mappedPorts.forEach((mappedPort) => {
        if (mappedPort.targetServerName === serverName) {
          const { port, protocol } = mappedPort;
          const isTCP = protocol.includes('TCP');
          const isUDP = protocol.includes('UDP');

          if (port.includes(',')) {
            port.split(',').forEach((p) => {
              const trimmedPort = p.trim();
              totalInboundPorts.add(trimmedPort);
              if (isTCP) tcpPorts.add(trimmedPort);
              if (isUDP) udpPorts.add(trimmedPort);
            });
          } else if (port.includes('-')) {
            totalInboundPorts.add(port);

            if (isTCP) tcpPorts.add(port);
            if (isUDP) udpPorts.add(port);
            const [start, end] = port.split('-').map(Number);
            portRange += end - start;
          } else {
            totalInboundPorts.add(port);
            if (isTCP) tcpPorts.add(port);
            if (isUDP) udpPorts.add(port);
          }
        }
      });
    });

    const portQty = totalInboundPorts.size + portRange;
    return [portQty, Array.from(tcpPorts), Array.from(udpPorts)];
  }

  // Update the port mapping data
  updatePortMapping(portMapping: PortMapping, index: number): void {
    this.mappedPorts[index] = portMapping;
    this.recalculateServerMapedPorts();
    this.recalculateMappedPorts();
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
