import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MappedPorts, PortMapping, ShowMappedPorts } from '../services';
import { DataService } from '../data.service';
import { HttpService } from '../http.service';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { v4 as uuidv4 } from 'uuid';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  portsServer = environment.portsServer;
  isModalActive: boolean = false;
  serverName: string = '';
  serverIndex = 2;
  sourceServer = '';
  repeatServerName: boolean = false;
  codeStringTcp = '';
  codeStringUdp = '';
  codeStringInboundTcp = '';
  codeStringInboundUdp = '';
  showTable: boolean = true;

  portsMapped: PortMapping[] = [];
  portsDisplay: MappedPorts[] = [];
  inboundPortsDisplay: MappedPorts[] = [];
  selectedCardIndex: number | null = null;

  showMappedPorts: ShowMappedPorts[] = [];
  showMappedInboundPorts: ShowMappedPorts[] = [];

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
    this.portsDisplay = this.portsMapped[index].mappedPorts;
    this.sourceServer = this.portsMapped[index].sourceServer;
    this.showMappedPorts = this.portsMapped[index].mappedPortsByProtocol;
    this.showMappedInboundPorts =
      this.portsMapped[index].mappedPortsByProtocolInbound;

    this.codeStringTcp = this.portsMapped[index].allOutboundPortsTcp
      ? this.portsMapped[index].allOutboundPortsTcp.join(',')
      : '';
    this.codeStringUdp = this.portsMapped[index].allOutboundPortsUdp
      ? this.portsMapped[index].allOutboundPortsUdp.join(',')
      : '';
    this.codeStringInboundTcp = this.portsMapped[index].allInboundPortsTcp
      ? this.portsMapped[index].allInboundPortsTcp.join(',')
      : '';
    this.codeStringInboundUdp = this.portsMapped[index].allInboundPortsUdp
      ? this.portsMapped[index].allInboundPortsUdp.join(',')
      : '';
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

  // checkForMappedPorts(index: number): boolean {
  //   if (
  //     this.portsMapped[index].mappedPorts.length > 0 ||
  //     this.portsMapped.length > 2
  //   ) {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // }

  checkMappedPortLength(): boolean {
    const mappedPortsTotal = this.portsMapped.flatMap(
      (mappedPort) => mappedPort.mappedPorts
    ).length;
    if (mappedPortsTotal > 0) {
      return false;
    } else {
      return true;
    }
  }

  getExcelData(): void {
    const originalText = 'Export Excel';
    const button = event?.target as HTMLElement;
    if (button) {
      button.innerHTML =
        '<span class="loading-spinner mr-2"></span><span>Generating...</span>';
    }

    this.httpService.generateExcelData(this.portsMapped).subscribe({
      next: (data) => {
        let urlUpdated = '';
        if (this.portsServer.includes('localhost')) {
          urlUpdated = `${this.portsServer}${data.file_url}`;
        } else {
          urlUpdated = `${this.portsServer}${data.file_url.split('.com/')[1]}`;
        }
        window.open(urlUpdated);

        if (button) {
          button.innerHTML =
            '<span class="icon"><i class="fas fa-check"></i></span><span>Downloaded!</span>';
          setTimeout(() => {
            button.innerHTML =
              '<span class="icon"><i class="fas fa-file-excel"></i></span><span>Export Excel</span>';
          }, 2000);
        }
      },
      error: (error) => {
        console.error('Error generating Excel:', error);
        if (button) {
          button.innerHTML =
            '<span class="icon"><i class="fas fa-exclamation-triangle"></i></span><span>Error</span>';
          setTimeout(() => {
            button.innerHTML =
              '<span class="icon"><i class="fas fa-file-excel"></i></span><span>Export Excel</span>';
          }, 2000);
        }
      },
    });
  }

  savePortMappings(): void {
    const button = event?.target as HTMLElement;
    if (button) {
      button.innerHTML =
        '<span class="loading-spinner mr-2"></span><span>Saving...</span>';
    }

    setTimeout(() => {
      const dataStr = JSON.stringify(this.portsMapped, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `port-mappings-${uuidv4()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      if (button) {
        button.innerHTML =
          '<span class="icon"><i class="fas fa-check"></i></span><span>Saved!</span>';
        setTimeout(() => {
          button.innerHTML =
            '<span class="icon"><i class="fas fa-download"></i></span><span>Save Config</span>';
        }, 2000);
      }
    }, 500); // Small delay to show loading state
  }

  uploadPortMappings(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fileLabel = input
      .closest('.file')
      ?.querySelector('.file-label') as HTMLElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Show loading state
      if (fileLabel) {
        fileLabel.innerHTML =
          '<span class="file-icon"><div class="loading-spinner"></div></span><span class="file-label">Uploading...</span>';
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          this.portsMapped = JSON.parse(result);
          this.dataService.uploadPortMapping(this.portsMapped);

          // Show success state
          if (fileLabel) {
            fileLabel.innerHTML =
              '<span class="file-icon"><i class="fas fa-check"></i></span><span class="file-label">Uploaded!</span>';
            setTimeout(() => {
              fileLabel.innerHTML =
                '<span class="file-icon"><i class="fas fa-upload"></i></span><span class="file-label">Upload Config</span>';
            }, 2000);
          }

          // Reset file input
          input.value = '';
        } catch (error) {
          console.error('Error parsing JSON:', error);

          // Show error state
          if (fileLabel) {
            fileLabel.innerHTML =
              '<span class="file-icon"><i class="fas fa-exclamation-triangle"></i></span><span class="file-label">Error!</span>';
            setTimeout(() => {
              fileLabel.innerHTML =
                '<span class="file-icon"><i class="fas fa-upload"></i></span><span class="file-label">Upload Config</span>';
            }, 2000);
          }
        }
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
