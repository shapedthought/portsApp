import { Component, ElementRef, HostListener, OnInit, computed, inject, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { ChevronDown, Download, LucideAngularModule, Plus, Upload } from 'lucide-angular';
import { v4 as uuidv4 } from 'uuid';
import { DataService } from '../data.service';
import { HttpService } from '../http.service';
import { environment } from '../../environments/environment';
import { NetworkMapComponent } from '../network-map/network-map.component';
import { ServerDetailComponent } from '../server-detail/server-detail.component';
import { ThemeService } from '../theme.service';
import { ServerInfo } from '../topology';
import { Mode, WorkspaceService } from '../workspace.service';

/** Dashboard and Map modes: page header, stat strip, server table or map, and the detail panel. */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, Dialog, LucideAngularModule, NetworkMapComponent, ServerDetailComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  readonly dataService = inject(DataService);
  readonly ws = inject(WorkspaceService);
  readonly theme = inject(ThemeService);
  private readonly httpService = inject(HttpService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly icons = { ChevronDown, Download, Plus, Upload };
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  portsServer = environment.portsServer;
  isModalActive = false;
  isRenameModalActive = false;
  serverName = '';
  renameServerName = '';
  renameServerId = '';
  renameRepeatServerName = false;
  repeatServerName = false;
  isExportMenuOpen = false;
  isDownloading = false;
  isUploading = false;

  readonly mode = this.ws.mode;

  readonly header = computed(() => {
    const copy = this.theme.copy();
    return this.mode() === 'dash'
      ? { kicker: copy.dashKicker, title: 'Server port management', subtitle: 'Manage and configure network port mappings between your servers' }
      : { kicker: copy.mapKicker, title: 'Network map', subtitle: 'How your servers connect, and which ports each connection needs' };
  });

  readonly statCells = computed(() => {
    const s = this.ws.stats();
    return [
      { label: 'Servers', value: s.servers },
      { label: 'Connections', value: s.connections },
      { label: 'Port mappings', value: s.portMappings },
      { label: 'TCP', value: s.tcp },
      { label: 'UDP', value: s.udp },
    ];
  });

  readonly selectedName = computed(() => {
    const sel = this.ws.selection();
    return sel.type === 'node' ? sel.id : null;
  });

  ngOnInit(): void {
    this.ws.mode.set((this.route.snapshot.data['mode'] as Mode) ?? 'dash');
    this.dataService.loadPortMapping();
  }

  selectServer(name: string): void {
    this.ws.select({ type: 'node', id: name });
  }

  // ---------- Add server ----------

  openModal(): void {
    this.serverName = '';
    this.repeatServerName = false;
    this.isModalActive = true;
  }

  closeModal(): void {
    this.isModalActive = false;
  }

  checkServerName(name: string): void {
    this.repeatServerName = this.dataService.mappedPorts().some(pm => pm.sourceServer === name);
  }

  /** Names must be 3–20 characters and unique. */
  isValidName(name: string, duplicate: boolean): boolean {
    return name.length >= 3 && name.length <= 20 && !duplicate;
  }

  submitModal(): void {
    if (!this.isValidName(this.serverName, this.repeatServerName)) return;
    const newServerName = this.serverName;
    this.dataService.addNewServer(newServerName);
    this.closeModal();
    this.serverName = '';
    this.repeatServerName = false;
    this.selectServer(newServerName);
    this.messageService.add({
      severity: 'success',
      summary: 'Server Added',
      detail: `"${newServerName}" has been added successfully.`,
    });
  }

  // ---------- Detail panel actions ----------

  openRenameModal(server: ServerInfo): void {
    if (!server.id) return;
    this.renameServerId = server.id;
    this.renameServerName = server.name;
    this.renameRepeatServerName = false;
    this.isRenameModalActive = true;
  }

  closeRenameModal(): void {
    this.isRenameModalActive = false;
  }

  checkRenameServerName(name: string): void {
    this.renameRepeatServerName = this.dataService
      .mappedPorts()
      .some(pm => pm.id !== this.renameServerId && pm.sourceServer === name);
  }

  submitRenameModal(): void {
    if (!this.isValidName(this.renameServerName, this.renameRepeatServerName)) return;
    const newName = this.renameServerName;
    const oldName = this.dataService.mappedPorts().find(pm => pm.id === this.renameServerId)?.sourceServer ?? '';
    const wasSelected = this.selectedName() === oldName;
    this.dataService.updateName(newName, this.renameServerId);
    this.closeRenameModal();
    if (wasSelected) this.selectServer(newName);
    this.messageService.add({
      severity: 'success',
      summary: 'Server Renamed',
      detail: `"${oldName}" has been renamed to "${newName}".`,
    });
  }

  editMappings(server: ServerInfo): void {
    if (server.id) this.router.navigate(['/mapping', server.id]);
  }

  deleteServer(server: ServerInfo): void {
    const id = server.id;
    if (!id) return;
    this.confirmationService.confirm({
      header: 'Delete Server',
      message: `Delete "${server.name}"? This also deletes all of its port mappings.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.dataService.deleteServer(id);
        this.messageService.add({
          severity: 'success',
          summary: 'Server Deleted',
          detail: `"${server.name}" has been removed.`,
        });
      },
    });
  }

  clearAllMappedPorts(): void {
    this.confirmationService.confirm({
      header: 'Clear All Mappings',
      message: 'Are you sure you want to delete all servers and mappings? This cannot be undone.',
      acceptLabel: 'Clear all',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.dataService.deleteAll();
        this.ws.select({ type: 'none' });
        this.messageService.add({
          severity: 'success',
          summary: 'All Cleared',
          detail: 'All port mappings have been removed.',
        });
      },
    });
  }

  // ---------- Export ----------

  toggleExportMenu(): void {
    this.isExportMenuOpen = !this.isExportMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const menu = this.host.nativeElement.querySelector('.export');
    if (this.isExportMenuOpen && menu && !menu.contains(event.target as Node)) {
      this.isExportMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isExportMenuOpen = false;
  }

  exportJson(): void {
    this.isExportMenuOpen = false;
    const dataStr = JSON.stringify(this.dataService.mappedPorts(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `port-mappings-${uuidv4()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.messageService.add({
      severity: 'success',
      summary: 'Export Complete',
      detail: 'JSON configuration file has been downloaded.',
    });
  }

  exportExcel(): void {
    this.isExportMenuOpen = false;
    if (this.isDownloading) return;
    this.isDownloading = true;

    this.httpService.generateExcelData(this.dataService.mappedPorts()).subscribe({
      next: data => {
        const urlUpdated = this.portsServer.includes('localhost')
          ? `${this.portsServer}${data.file_url}`
          : `${this.portsServer}${data.file_url.split('.com/')[1]}`;
        window.open(urlUpdated);
        this.isDownloading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Export Complete',
          detail: 'Excel file has been generated and opened.',
        });
      },
      error: () => {
        this.isDownloading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Export Failed',
          detail: 'Failed to generate Excel file. Please try again.',
        });
      },
    });
  }

  // ---------- Upload ----------

  chooseUploadFile(): void {
    this.fileInput().nativeElement.click();
  }

  uploadPortMappings(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploading = true;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target?.result as string);

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
        this.ws.select({ type: 'none' });
        this.messageService.add({
          severity: 'success',
          summary: 'Upload Successful',
          detail: `Loaded ${parsed.length} server configurations from file.`,
        });
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Upload Failed',
          detail: error instanceof Error ? error.message : 'Failed to parse JSON file.',
        });
      } finally {
        this.isUploading = false;
        input.value = '';
      }
    };
    reader.readAsText(file);
  }
}
