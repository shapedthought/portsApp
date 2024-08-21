import { Injectable } from '@angular/core';
import { PortMapping } from './services';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  mappedPorts: PortMapping[] =
    [
      {id: 0, sourceServer: 'Server 1', totalMappedPorts: 3, totalMappedServers: 2, mappedPorts: [ 
        {targetServerId: '123', targetServerName: 'Server 2', sourceService: 'thing 1', targetService: 'thing 2', description: 'service 123', product: 'VBR', fromPort: '123', toPort: '345', protocol: 'TCP'},
        {targetServerId: '453', targetServerName: 'Server 3', sourceService: 'thing 1', targetService: 'thing 2', description: 'service 456', product: 'VBAZ', fromPort: '123', toPort: '345', protocol: 'TCP'},
        {targetServerId: '222', targetServerName: 'Server 4', sourceService: 'thing 1', targetService: 'thing 2', description: 'service 789', product: 'VBAWS', fromPort: '123', toPort: '345', protocol: 'TCP'}
      ]},
      {id: 1, sourceServer: 'Server 2', totalMappedPorts: 3, totalMappedServers: 2, mappedPorts: [ 
        {targetServerId: '432', targetServerName: 'Server 3', sourceService: 'thing 1', targetService: 'thing 2', description: 'service 123', product: 'VBR', fromPort: '123', toPort: '345', protocol: 'TCP'},
        {targetServerId: '235', targetServerName: 'Server 4', sourceService: 'thing 1', targetService: 'thing 2', description: 'service 456', product: 'VBAZ', fromPort: '123', toPort: '345', protocol: 'TCP'},
        {targetServerId: '948', targetServerName: 'Server 5', sourceService: 'thing 1', targetService: 'thing 2', description: 'service 789', product: 'VBAWS', fromPort: '123', toPort: '345', protocol: 'TCP'}
      ]},
    ];


  getMappedPorts(): PortMapping[] {
    return this.mappedPorts
  }

  deleteServer(index: number) {
    this.mappedPorts.splice(index, 1);
  }

  constructor() { }
}
