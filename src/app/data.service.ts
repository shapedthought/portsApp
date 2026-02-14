import { Injectable, signal, computed } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { MappedPorts, PortMapping, Server, createDefaultPortMapping } from './services';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  readonly mappedPorts = signal<PortMapping[]>([
    createDefaultPortMapping(uuidv4(), 'Server 1'),
    createDefaultPortMapping(uuidv4(), 'Server 2'),
  ]);

  readonly servers = computed<Server[]>(() => {
    const names = new Set<string>();
    this.mappedPorts().forEach(pm => {
      names.add(pm.sourceServer);
      pm.mappedPorts.forEach(mp => names.add(mp.targetServerName));
    });
    return Array.from(names).map((name, id) => ({ id, name }));
  });

  readonly hasMappedPorts = computed(() =>
    this.mappedPorts().some(pm => pm.mappedPorts.length > 0)
  );

  selectedService: string = 'VB365';

  updatedSelectedService(service: string): void {
    this.selectedService = service;
  }

  getSelectedService(): string {
    return this.selectedService;
  }

  savePortMapping(): void {
    localStorage.setItem('portMapping', JSON.stringify(this.mappedPorts()));
  }

  loadPortMapping(): void {
    const portMappingStr = localStorage.getItem('portMapping');
    if (portMappingStr) {
      const parsed = JSON.parse(portMappingStr) as PortMapping[];
      // Auto-migrate: convert integer IDs to UUIDs
      let migrated = false;
      const result = parsed.map(pm => {
        if (typeof pm.id === 'number' || /^\d+$/.test(String(pm.id))) {
          migrated = true;
          return { ...pm, id: uuidv4() };
        }
        return pm;
      });
      this.mappedPorts.set(result);
      if (migrated) {
        this.savePortMapping();
      }
    }
  }

  deleteAll(): void {
    localStorage.removeItem('portMapping');
    this.mappedPorts.set([
      createDefaultPortMapping(uuidv4(), 'Server 1'),
      createDefaultPortMapping(uuidv4(), 'Server 2'),
    ]);
  }

  // Upload port mapping data from JSON file
  uploadPortMapping(portMapping: PortMapping[]): void {
    this.mappedPorts.set(portMapping);
    this.savePortMapping();
  }

  // Delete a server from the port mapping by UUID
  deleteServer(id: string): void {
    this.mappedPorts.update(current => {
      const filtered = current.filter(pm => pm.id !== id);
      return filtered;
    });
    this.recalculateServerMapedPorts();
    this.recalculateMappedPorts();
    this.savePortMapping();
  }

  // Add a new server to the port mapping
  addNewServer(serverName: string): void {
    const id = uuidv4();
    this.mappedPorts.update(current => [...current, createDefaultPortMapping(id, serverName)]);
    this.savePortMapping();
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

    this.mappedPorts.update(current => {
      return current.map(portMapping => {
        const outboundPorts = reducePorts(portMapping.mappedPorts, (port: MappedPorts) => `${port.targetServerName}-${port.protocol}`);
        const inboundPorts = reducePorts(
          current.flatMap((item) =>
            item.mappedPorts.filter(
              (mappedPort) => mappedPort.targetServerName === portMapping.sourceServer
            )
          ),
          (port) => `${port.sourceServerName}-${port.protocol}`
        );
        return {
          ...portMapping,
          mappedPortsByProtocol: mapToProtocolArray(outboundPorts),
          mappedPortsByProtocolInbound: mapToProtocolArray(inboundPorts),
        };
      });
    });
  }

  // Recalculate the mapped ports for each server
  recalculateMappedPorts(): void {
    this.mappedPorts.update(current => {
      return current.map(portMapping => {
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

        const [portQty, tcpPortsIn, udpPortsIn] = this.getTotalInboundPorts(portMapping.sourceServer, current);

        return {
          ...portMapping,
          totalMappedPorts: ports.size + portRange,
          totalMappedServers: new Set(
            portMapping.mappedPorts.map(({ targetServerName }) => targetServerName)
          ).size,
          totalMappedInboundPorts: portQty,
          allOutboundPortsTcp: Array.from(tcpPorts),
          allOutboundPortsUdp: Array.from(udpPorts),
          allInboundPortsTcp: tcpPortsIn,
          allInboundPortsUdp: udpPortsIn,
        };
      });
    });

    this.savePortMapping();
  }

  // Get the total number of inbound ports for a server
  private getTotalInboundPorts(serverName: string, allPorts: PortMapping[]): [number, string[], string[]] {
    const totalInboundPorts = new Set<string>();
    const tcpPorts = new Set<string>();
    const udpPorts = new Set<string>();
    let portRange = 0;

    allPorts.forEach((portMapping) => {
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

  // Update the port mapping data by UUID
  updatePortMapping(portMapping: PortMapping): void {
    this.mappedPorts.update(current => {
      return current.map(pm => pm.id === portMapping.id ? portMapping : pm);
    });
    this.recalculateServerMapedPorts();
    this.recalculateMappedPorts();
  }

  // Update the server name in the port mapping data by UUID
  updateName(newName: string, id: string) {
    this.mappedPorts.update(current => {
      const target = current.find(p => p.id === id);
      if (!target) return current;
      const oldName = target.sourceServer;
      return current.map(pm => ({
        ...pm,
        sourceServer: pm.id === id ? newName : pm.sourceServer,
        mappedPorts: pm.mappedPorts.map(mp => ({
          ...mp,
          targetServerName: mp.targetServerName === oldName ? newName : mp.targetServerName,
        })),
      }));
    });
    this.savePortMapping();
  }

  constructor() {}
}
