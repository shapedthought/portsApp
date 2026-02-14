import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MappedPorts, ShowMappedPorts } from '../services';
import { DataService } from '../data.service';
import { HttpService } from '../http.service';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { v4 as uuidv4 } from 'uuid';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, Dialog],
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
  portsDisplay: MappedPorts[] = [];
  inboundPortsDisplay: MappedPorts[] = [];
  selectedCardIndex: number | null = null;

  showMappedPorts: ShowMappedPorts[] = [];
  showMappedInboundPorts: ShowMappedPorts[] = [];
  isDownloading: boolean = false;
  isSaving: boolean = false;
  isUploading: boolean = false;

  submitModal() {
    const newServerName = this.serverName;
    this.dataService.addNewServer(newServerName);
    this.closeModal();
    this.serverName = '';
    this.repeatServerName = false;
    this.messageService.add({
      severity: 'success',
      summary: 'Server Added',
      detail: `"${newServerName}" has been added successfully.`
    });
  }

  closeModal() {
    this.isModalActive = false;
  }

  openModal() {
    this.serverName = '';
    this.isModalActive = true;
  }

  checkServerName(name: string) {
    const serverNames = this.dataService.mappedPorts().map(
      (portMapping) => portMapping.sourceServer
    );
    if (serverNames.includes(name)) {
      this.repeatServerName = true;
    } else {
      this.repeatServerName = false;
    }
  }

  deleteServer(id: string): void {
    const pm = this.dataService.mappedPorts().find(p => p.id === id);
    const serverName = pm ? pm.sourceServer : 'Unknown';
    this.confirmationService.confirm({
      header: 'Delete Server',
      message: 'Are you sure you want to delete this server? This will also delete all mapped ports to this server.',
      icon: 'fas fa-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.dataService.deleteServer(id);
        this.portsDisplay = [];
        this.selectedCardIndex = null;
        this.messageService.add({
          severity: 'success',
          summary: 'Server Deleted',
          detail: `"${serverName}" has been removed.`
        });
      }
    });
  }

  loadMappedPorts(index: number): void {
    const ports = this.dataService.mappedPorts();
    this.selectedCardIndex = index;
    this.portsDisplay = ports[index].mappedPorts;
    this.sourceServer = ports[index].sourceServer;
    this.showMappedPorts = ports[index].mappedPortsByProtocol;
    this.showMappedInboundPorts = ports[index].mappedPortsByProtocolInbound;

    this.codeStringTcp = ports[index].allOutboundPortsTcp
      ? ports[index].allOutboundPortsTcp.join(',')
      : '';
    this.codeStringUdp = ports[index].allOutboundPortsUdp
      ? ports[index].allOutboundPortsUdp.join(',')
      : '';
    this.codeStringInboundTcp = ports[index].allInboundPortsTcp
      ? ports[index].allInboundPortsTcp.join(',')
      : '';
    this.codeStringInboundUdp = ports[index].allInboundPortsUdp
      ? ports[index].allInboundPortsUdp.join(',')
      : '';
  }

  clearAllMappedPorts(): void {
    this.confirmationService.confirm({
      header: 'Clear All Mappings',
      message: 'Are you sure you want to delete all mappings? This cannot be undone.',
      icon: 'fas fa-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.dataService.deleteAll();
        this.portsDisplay = [];
        this.selectedCardIndex = null;
        this.messageService.add({
          severity: 'success',
          summary: 'All Cleared',
          detail: 'All port mappings have been removed.'
        });
      }
    });
  }

  checkMappedPortLength(): boolean {
    return !this.dataService.hasMappedPorts();
  }

  getExcelData(): void {
    if (this.isDownloading) return;
    this.isDownloading = true;

    this.httpService.generateExcelData(this.dataService.mappedPorts()).subscribe({
      next: (data) => {
        let urlUpdated = '';
        if (this.portsServer.includes('localhost')) {
          urlUpdated = `${this.portsServer}${data.file_url}`;
        } else {
          urlUpdated = `${this.portsServer}${data.file_url.split('.com/')[1]}`;
        }
        window.open(urlUpdated);
        this.isDownloading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Export Complete',
          detail: 'Excel file has been generated and opened.'
        });
      },
      error: () => {
        this.isDownloading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Export Failed',
          detail: 'Failed to generate Excel file. Please try again.'
        });
      },
    });
  }

  savePortMappings(): void {
    this.isSaving = true;

    setTimeout(() => {
      const dataStr = JSON.stringify(this.dataService.mappedPorts(), null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `port-mappings-${uuidv4()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      this.isSaving = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Export Complete',
        detail: 'JSON configuration file has been downloaded.'
      });
    }, 500);
  }

  uploadPortMappings(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.isUploading = true;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const parsed = JSON.parse(result);

          if (!Array.isArray(parsed)) {
            throw new Error('Expected an array of port mappings');
          }
          for (const item of parsed) {
            if (item.id == null || (typeof item.id !== 'number' && typeof item.id !== 'string')) {
              throw new Error('Each item must have an "id" (number or string)');
            }
            if (!item.sourceServer || typeof item.sourceServer !== 'string') {
              throw new Error('Each item must have a "sourceServer" string');
            }
            if (!Array.isArray(item.mappedPorts)) {
              throw new Error('Each item must have a "mappedPorts" array');
            }
          }

          this.dataService.uploadPortMapping(parsed);
          this.isUploading = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Upload Successful',
            detail: `Loaded ${parsed.length} server configurations from file.`
          });
          input.value = '';
        } catch (error) {
          this.isUploading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Upload Failed',
            detail: error instanceof Error ? error.message : 'Failed to parse JSON file.'
          });
        }
      };
      reader.readAsText(file);
    }
  }

  constructor(
    public dataService: DataService,
    private httpService: HttpService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.dataService.loadPortMapping();
    this.sourceServer = this.dataService.mappedPorts()[0].sourceServer;
  }
}
