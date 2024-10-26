import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MappedPorts, PortMapping, ShowMappedPorts } from '../services';
import { DataService } from '../data.service';
import { HttpService } from '../http.service';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { v4 as uuidv4 } from 'uuid';

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
  showTable: boolean = true;

  portsMapped: PortMapping[] = [];
  portsDisplay: MappedPorts[] = [];
  inboundPortsDisplay: MappedPorts[] = [];
  selectedCardIndex: number | null = null;

  showMappedPorts: ShowMappedPorts[] = []; 
  showMappedInboundPorts: ShowMappedPorts[] = [];
  portsServer = 'https://app.veeambp.com/ports_server/';

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
      const key = `${mappedPort.targetServerName}-${mappedPort.protocol}`;
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
      const [serverName, protocol] = key.split('-');
      return {
        serverName,
        service: '',
        protocol,
        port: value.join(', ')
      };
    });

    const tempTargetPorts = this.portsMapped
      .map(item => item.mappedPorts.filter(mappedPort => mappedPort.targetServerName === this.sourceServer))
      .flat();

    let portsReducesInbound = new Map();

    tempTargetPorts.forEach(mappedPort => {
      const key = `${mappedPort.sourceServerName}-${mappedPort.protocol}`;
      const index = portsReducesInbound.get(key);
      if (!portsReducesInbound.has(key)) {
        portsReducesInbound.set(key, [mappedPort.port]);
      } else {
        if (index.includes(mappedPort.port)) {
          return
        }
        portsReducesInbound.set(key, [...index, mappedPort.port]);
      }
    }
    );

    this.showMappedInboundPorts = Array.from(portsReducesInbound).map(([key, value]) => {
      const [serverName, protocol] = key.split('-');
      return {
        serverName,
        service: '',
        protocol,
        port: value.join(', ')
      };
    });


      
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

  cleaAllMappedPorts(): void {
    Swal.fire({
      title: 'Are you sure you want to delete all mappings?',
      text: 'This cannot be undone.',
      showDenyButton: true,
      confirmButtonText: `Yes`,
      denyButtonText: `No`,
    }).then((result) => {
      if (result.isConfirmed) {
        this.dataService.deleteAll();
        this.portsMapped = this.dataService.getMappedPorts();
        this.portsDisplay = [];
      }
    });
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

  checkMappedPortLength(): boolean {
    const mappedPortsTotal = this.portsMapped.flatMap(mappedPort => mappedPort.mappedPorts).length;
    if (mappedPortsTotal > 0) {
      return false;
    } else {
      return true;
    }
  }

  getExcelData(): void {
    this.httpService.generateExcelData(this.portsMapped).subscribe((data) => {
      const urlUpdated = `${this.portsServer}${data.file_url.split('.com/')[1]}`;
      window.open(urlUpdated);
    });
  }

  savePortMappings(): void {
    const dataStr = JSON.stringify(this.portsMapped, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `port-mappings-${uuidv4()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  uploadPortMappings(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.portsMapped = JSON.parse(result);
        this.dataService.uploadPortMapping(this.portsMapped);
      };
      reader.readAsText(file);
    }
  }

  constructor(
    private dataService: DataService,
    private httpService: HttpService
  ) {}

  ngOnInit(): void {
    this.dataService.loadPortMapping();
    this.portsMapped = this.dataService.getMappedPorts();
    this.sourceServer = this.portsMapped[0].sourceServer;
  }
}
