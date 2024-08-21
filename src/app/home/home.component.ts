import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MappedPorts, PortMapping } from '../services';
import { DataService } from '../data.service'; 

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  serverIndex = 2;
  sourceServer = '';

  portsMapped: PortMapping[] = []
  portsDisplay: MappedPorts[] = [];

  getServerData(): void {
    this.portsMapped = this.dataService.getMappedPorts();
  }

  deleteServer(index: number): void { 
    this.dataService.deleteServer(index);
  }

  loadMappedPorts(index: number): void {
    this.portsDisplay = this.portsMapped[index].mappedPorts;
    this.sourceServer = this.portsMapped[index].sourceServer;
  }

  dataService: DataService = inject(DataService);
  

  constructor() { 
    this.portsMapped = this.dataService.getMappedPorts();
  }
    
}
