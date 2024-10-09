import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MappedPorts, PortMapping, ShowMappedPorts } from '../services';
import { DataService } from '../data.service';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  isModalActive: boolean = false;
  serverName: string = '';
  serverIndex = 2;
  sourceServer = '';
  repeatServerName: boolean = false;
  codeString = '';

  portsMapped: PortMapping[] = [];
  portsDisplay: MappedPorts[] = [];
  inboundPortsDisplay: MappedPorts[] = [];
  selectedCardIndex: number | null = null;

  showMappedPorts: ShowMappedPorts[] = []; 

  submitModal() {
    this.dataService.addNewServer(this.serverName);
    this.closeModal();
  }

  closeModal() {
    this.isModalActive = false;
  }

  openModal() {
    this.serverName = '';
    this.isModalActive = true;
  }

  getServerData(): void {
    this.portsMapped = this.dataService.getMappedPorts();
  }

  checkServerName(name: string) {
    const serverNames = this.portsMapped.map(
      (portMapping) => portMapping.sourceServer
    );
    if (serverNames.includes(name)) {
      this.repeatServerName = true;
    } else {
      this.repeatServerName = false;
    }
  }

  deleteServer(index: number): void {
    Swal.fire({
      title: 'Are you sure you want to delete this server?',
      text: 'This will also delete all mapped ports to this server.',
      showDenyButton: true,
      confirmButtonText: `Yes`,
      denyButtonText: `No`,
    }).then((result) => {
      if (result.isConfirmed) {
        this.dataService.deleteServer(index);
        this.portsMapped = this.dataService.getMappedPorts();
        this.portsDisplay = [];
      }
    });

    // this.dataService.deleteServer(index);
    // this.portsMapped = this.dataService.getMappedPorts();
  }

  loadMappedPorts(index: number): void {
    this.selectedCardIndex = index;

    // reduce the mapped ports by grouping them by the tartget server name
    this.portsDisplay = this.portsMapped[index].mappedPorts;
    this.sourceServer = this.portsMapped[index].sourceServer;

    const processPortString = (portString: string): string => {
      if (portString.includes('to')) {
        return portString.split('to').map(item => item.trim()).join('-')
      }
      else if (portString.includes(',')) {
        return portString.replaceAll(',', '')
      }
      else {
        return portString
      }
    };

    let portsReduces = new Map();

    // reduce the mapped ports by grouping them by the targetServerName, targetService and protocol
    this.portsMapped[index].mappedPorts.forEach(mappedPort => {
      const key = `${mappedPort.targetServerName}-${mappedPort.targetService}-${mappedPort.protocol}`;
      const index = portsReduces.get(key);
      if (!portsReduces.has(key)) {
        portsReduces.set(key, [mappedPort.port]);
      } else {
        if (index.includes(mappedPort.port)) {
          return
        }
        portsReduces.set(key, [...index, mappedPort.port]);
      }
    });

    // convert the map to an array
    this.showMappedPorts = Array.from(portsReduces).map(([key, value]) => {
      const [targetServerName, targetService, protocol] = key.split('-');
      return {
        targetServerName,
        targetService,
        protocol,
        port: value.join(', ')
      };
    });

    console.log('portsReduces');
    console.log(this.showMappedPorts);

    this.inboundPortsDisplay = this.portsMapped
      .map(item => item.mappedPorts.filter(mappedPort => mappedPort.targetServerName === this.sourceServer))
      .flat();

      
    const tcpStrings = Array.from(
      new Set(
        this.portsDisplay
          // filter the protocol 
          .filter((mappedPort) => mappedPort.protocol.includes('TCP'))
          // map the mapped port throught the process port string function
          .map((mappedPort) => processPortString(mappedPort.port))
          .flatMap(item => item.split(' ').filter(Boolean))
      )
    ).join(',');
    const udpStrings = Array.from(
      new Set(
        this.portsDisplay
          .filter((mappedPort) => mappedPort.protocol.includes('UDP'))
          .map((mappedPort) => processPortString(mappedPort.port))
          .flatMap(item => item.split(' ').filter(Boolean))
      )
    ).join(',');

    this.codeString = `TCP Ports: ${tcpStrings}`;
    if (udpStrings) {
      this.codeString += `\n\nUDP Ports: ${udpStrings}`;
    }
  }

  checkForMappedPorts(index: number): boolean {
    if (
      this.portsMapped[index].mappedPorts.length > 0 ||
      this.portsMapped.length > 2
    ) {
      return true;
    } else {
      return false;
    }
  }

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.portsMapped = this.dataService.getMappedPorts();
    this.sourceServer = this.portsMapped[0].sourceServer;
  }
}
