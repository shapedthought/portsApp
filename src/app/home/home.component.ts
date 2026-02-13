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
  portsMapped: PortMapping[] = [];
  portsDisplay: MappedPorts[] = [];
  inboundPortsDisplay: MappedPorts[] = [];
  selectedCardIndex: number | null = null;

  showMappedPorts: ShowMappedPorts[] = [];
  showMappedInboundPorts: ShowMappedPorts[] = [];
  isDownloading: boolean = false;

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

  clearAllMappedPorts(): void {
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
    if (this.isDownloading) return;
    this.isDownloading = true;

    this.httpService.generateExcelData(this.portsMapped).subscribe({
      next: (data) => {
        let urlUpdated = '';
        if (this.portsServer.includes('localhost')) {
          urlUpdated = `${this.portsServer}${data.file_url}`;
        } else {
          urlUpdated = `${this.portsServer}${data.file_url.split('.com/')[1]}`;
        }
        window.open(urlUpdated);
        this.isDownloading = false;
      },
      error: (error) => {
        console.error('Error generating Excel:', error);
        this.isDownloading = false;
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
            '<span class="icon"><i class="fas fa-download"></i></span><span>Export JSON</span>';
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
          const parsed = JSON.parse(result);

          if (!Array.isArray(parsed)) {
            throw new Error('Expected an array of port mappings');
          }
          for (const item of parsed) {
            if (item.id == null || typeof item.id !== 'number') {
              throw new Error('Each item must have a numeric "id"');
            }
            if (!item.sourceServer || typeof item.sourceServer !== 'string') {
              throw new Error('Each item must have a "sourceServer" string');
            }
            if (!Array.isArray(item.mappedPorts)) {
              throw new Error('Each item must have a "mappedPorts" array');
            }
          }

          this.portsMapped = parsed;
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
