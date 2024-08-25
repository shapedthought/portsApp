import { Injectable } from '@angular/core';
import { PortMapping, Server } from './services';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  mappedPorts: PortMapping[] =
    [
      {id: 0, sourceServer: 'Server 1', totalMappedPorts: 0, totalMappedServers: 0, mappedPorts: []},
      {id: 1, sourceServer: 'Server 2', totalMappedPorts: 0, totalMappedServers: 0, mappedPorts: []},
    ];

  getMappedPorts(): PortMapping[] {
    return this.mappedPorts
  }

  deleteServer(index: number) {
    const removedServer = this.mappedPorts.splice(index, 1);
    this.mappedPorts.forEach(portMapping => {
      portMapping.mappedPorts = portMapping.mappedPorts.filter(mappedPort => mappedPort.targetServerName !== removedServer[0].sourceServer);
      portMapping.totalMappedPorts = portMapping.mappedPorts.length;
      portMapping.totalMappedServers = Array.from(new Set(portMapping.mappedPorts.map(mappedPort => mappedPort.targetServerName))).length;
    });
  }

  addNewServer(serverName: string): PortMapping[] {
    let id = this.mappedPorts.length;
    this.mappedPorts.push({id: id, sourceServer: serverName, totalMappedPorts: 0, totalMappedServers: 0, mappedPorts: []});
    return this.mappedPorts;
  }

  updatePortMapping(portMapping: PortMapping, index: number) {
    this.mappedPorts[index] = portMapping;
  }

  addPortMapping(portMapping: PortMapping) {
    this.mappedPorts.push(portMapping);
  }

  getServers(): Server[] {
    let serverStrings: string[] = [];
    let servers: Server[] = [];

    this.mappedPorts.forEach(portMapping => {
      serverStrings.push(portMapping.sourceServer);
      portMapping.mappedPorts.forEach(mappedPort => {
        serverStrings.push(mappedPort.targetServerName);
      });
    });

    serverStrings = Array.from(new Set(serverStrings));

    let id = 0;
    serverStrings.forEach(serverString => {
      servers.push({id: id, name: serverString});
      id++;
    }
    );  
    
    return servers;

  }

  updateName(newName: string, index: number) {
    const oldName = this.mappedPorts[index].sourceServer;
    this.mappedPorts.forEach(portMapping => {
      portMapping.mappedPorts.forEach(mappedPort => {
        if (mappedPort.targetServerName === oldName) {
          mappedPort.targetServerName = newName;
        }
      });
    }
    );
    this.mappedPorts[index].sourceServer = newName;

  }

  constructor() { }
}
