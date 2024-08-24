import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MappedPorts, PortMapping } from '../services';
import { DataService } from '../data.service'; 
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  isModalActive: boolean = false;
  serverName: string = '';
  serverIndex = 2;
  sourceServer = '';

  portsMapped: PortMapping[] = []
  portsDisplay: MappedPorts[] = [];
  selectedCardIndex: number | null = null;

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

  deleteServer(index: number): void { 
    Swal.fire({
      title: 'Are you sure you want to delete this server?',
      text: "This will also delete all mapped ports to this server.",
      showDenyButton: true,
      confirmButtonText: `Yes`,
      denyButtonText: `No`,
    }).then((result) => {
      if (result.isConfirmed) {
        this.dataService.deleteServer(index);
        this.portsMapped = this.dataService.getMappedPorts();
        this.portsDisplay = [];
      }
    })
    
    // this.dataService.deleteServer(index);
    // this.portsMapped = this.dataService.getMappedPorts();
  }

  loadMappedPorts(index: number): void {
    this.selectedCardIndex = index;
    this.portsDisplay = this.portsMapped[index].mappedPorts;
    this.sourceServer = this.portsMapped[index].sourceServer;
  }

  checkForMappedPorts(index: number): boolean {
    if (this.portsMapped[index].mappedPorts.length > 0 || this.portsMapped.length > 2) {
      return true;
    } else {
      return false;
    }
  }

  constructor(
    private dataService: DataService
  ) { 
  }

  ngOnInit(): void {
    this.portsMapped = this.dataService.getMappedPorts();
    this.sourceServer = this.portsMapped[0].sourceServer;
  }
    
}
