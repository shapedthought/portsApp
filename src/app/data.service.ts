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
    // Inbound ports
    this.mappedPorts.forEach((portMapping) => {
      let portsReduces = new Map<string, string[]>();
      portMapping.mappedPorts.forEach((mappedPort) => {
        const key = `${mappedPort.targetServerName}-${mappedPort.protocol}`;
        const index = portsReduces.get(key);
        if (!portsReduces.has(key)) {
          portsReduces.set(key, [mappedPort.port]);
        } else {
          if (index && index.includes(mappedPort.port)) {
            return;
          }
          portsReduces.set(key, [...(index || []), mappedPort.port]);
        }
      });
      let showMappedIndex = 0;
      portMapping.mappedPortsByProtocol = Array.from(portsReduces).map(
        ([key, value]) => {
          const [serverName, protocol] = key.split('-');
          let showMapped = {
            index: showMappedIndex,
            serverName,
            service: '',
            protocol,
            port: value.join(', '),
          };
          showMappedIndex++;
          return showMapped;
        }
      );
    });

    this.mappedPorts.forEach((portMapping) => {
      let portsReducesInbound = new Map<string, string[]>();
      this.mappedPorts
        .map((item) =>
          item.mappedPorts.filter(
            (mappedPort) =>
              mappedPort.targetServerName === portMapping.sourceServer
          )
        )
        .flat()
        .forEach((mappedPort) => {
          const key = `${mappedPort.sourceServerName}-${mappedPort.protocol}`;
          const index = portsReducesInbound.get(key);
          if (!portsReducesInbound.has(key)) {
            portsReducesInbound.set(key, [mappedPort.port]);
          } else {
            if (index && index.includes(mappedPort.port)) {
              return;
            }
            portsReducesInbound.set(key, [...(index || []), mappedPort.port]);
          }
        });

      let showMappedInboundIndex = 0;
      portMapping.mappedPortsByProtocolInbound = Array.from(
        portsReducesInbound
      ).map(([key, value]) => {
        const [serverName, protocol] = key.split('-');
        let showMapped = {
          index: showMappedInboundIndex,
          serverName,
          service: '',
          protocol,
          port: value.join(', '),
        };
        showMappedInboundIndex++;
        return showMapped;
      });
    });
  }

  // Recalculate the mapped ports for each server
  recalculateMappedPorts(): void {
    this.mappedPorts.forEach((portMapping) => {
      let ports: string[] = [];
      let tcpPorts: string[] = [];
      let udpPorts: string[] = [];
      let portRange = 0;
      portMapping.mappedPorts.forEach((mappedPort) => {
        const { port, protocol } = mappedPort;
        const isTCP = protocol.includes('TCP');
        const isUDP = protocol.includes('UDP');

        if (port.includes(',')) {
          port.split(',').forEach((p) => {
            const trimmedPort = p.trim();
            ports.push(trimmedPort);
            if (isTCP) tcpPorts.push(trimmedPort);
            if (isUDP) udpPorts.push(trimmedPort);
          });
        } else if (port.includes('-')) {
          ports.push(port);
          if (isTCP) tcpPorts.push(port);
          if (isUDP) udpPorts.push(port);
          const [start, end] = port.split('-').map(Number);
          portRange += end - start;
        } else {
          ports.push(port);
          if (isTCP) tcpPorts.push(port);
          if (isUDP) udpPorts.push(port);
        }
      });
      portMapping.totalMappedPorts =
        Array.from(new Set(ports)).length + portRange;
      portMapping.totalMappedServers = Array.from(
        new Set(
          portMapping.mappedPorts.map(
            (mappedPort) => mappedPort.targetServerName
          )
        )
      ).length;
      const [portQty, tcpPortsIn, udpPortsIn] = this.getTotalInboundPorts(
        portMapping.sourceServer
      );
      portMapping.totalMappedInboundPorts = portQty;
      portMapping.allOutboundPortsTcp = Array.from(new Set(tcpPorts));
      portMapping.allInboundPortsUdp = Array.from(new Set(udpPorts));
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
