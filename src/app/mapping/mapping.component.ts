import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FullServiceResponse,
  MappedPorts,
  MappedServices,
  PortMapping,
  Product,
  Server,
  Service,
  TargetServices,
} from '../services';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../data.service';
import { HttpService } from '../http.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mapping',
  standalone: true,
  imports: [NgClass, FormsModule, RouterLink],
  templateUrl: './mapping.component.html',
  styleUrl: './mapping.component.css',
})
export class MappingComponent {
  id = 0;
  sourceServiceSelected = 0;
  serverName = 'Change me';
  selectedProduct = '';
  selectedTargetServer = '';
  disableNameChange = false;
  servers: Server[] = [{ id: 0, name: 'server 1' }];
  products: Product[] = [];
  sourceServices: Service[] = [];
  sourceServiceName: string = '';
  fullServiceResponse: FullServiceResponse[] = [];
  targetServices: TargetServices[] = [];
  mappedServices: MappedServices[] = [];
  portMapping: PortMapping[] = [];
  selectedPortMapping: PortMapping = {
    id: 1,
    sourceServer: '',
    totalMappedPorts: 0,
    totalMappedInboundPorts: 0,
    totalMappedServers: 0,
    mappedPorts: [],
  };
  repeatServerName: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private httpService: HttpService
  ) {}

  ngOnInit() {
    this.dataService.loadPortMapping();
    const idParam = this.route.snapshot.params['id'];
    this.portMapping = this.dataService.getMappedPorts();
    this.servers = this.dataService.getServers();

    // Get the ID
    this.id = parseInt(idParam);

    // Get the port mappings based on the ID
    this.selectedPortMapping = this.portMapping[this.id];

    // Get the  serv=er name from the port mapping
    this.serverName = this.selectedPortMapping.sourceServer;

    this.selectedTargetServer = this.servers[0].name;

    if (this.serverName == this.selectedTargetServer) {
      // If the server name is the same as the target server, then select the other server
      this.selectedTargetServer = this.servers.filter(
        (server) => server.name !== this.serverName
      )[0].name;
    }

    this.selectedProduct =
      this.selectedPortMapping.mappedPorts.length > 0
        ? this.selectedPortMapping.mappedPorts[0].product
        : 'VB365';

    this.getApps();
    this.getSourceData();
  }

  selectService(index: number) {
    this.httpService
      .getTarget(this.selectedProduct, this.sourceServices[index].name)
      .subscribe((data) => {
        this.targetServices = [];
        this.fullServiceResponse = data;
        this.sourceServiceName = this.sourceServices[index].name;
        this.sourceServiceSelected = index;
      });
  }

  splitAndAddComman(port: string): string {
    if (port.includes(',')) {
      return port;
    } 
    const parts = port.split(" ");
    if (parts.length == 2) {
      return parts.join(', ');
    } else {
      return port;
    }

  }

  // Updates
  updateService(index: number) {

    let checkeAdded = false;
    // check if the service is already mapped
    this.selectedPortMapping.mappedPorts.forEach((mappedPort) => {
      if (
        mappedPort.targetService === this.fullServiceResponse[index].toPort &&
        mappedPort.sourceService === this.sourceServiceName &&
        mappedPort.product === this.fullServiceResponse[index].product &&
        mappedPort.protocol === this.fullServiceResponse[index].protocol &&
        mappedPort.port === this.fullServiceResponse[index].port &&
        mappedPort.sourceServerName === this.serverName &&
        mappedPort.targetServerName === this.selectedTargetServer
      ) {
        checkeAdded = true;
      }
    });
    if (checkeAdded) {
      return;
    }
    // Add the service to the mapped ports in the mapping component
    const checkedPort = this.splitAndAddComman(this.fullServiceResponse[index].port);
    let mappedPorts: MappedPorts = {
      sourceServerId: this.id,
      sourceServerName: this.serverName,
      targetServerId: this.selectedPortMapping.id,
      targetServerName: this.selectedTargetServer,
      sourceService: this.sourceServiceName,
      targetService: this.fullServiceResponse[index].toPort,
      description: this.fullServiceResponse[index].description,
      product: this.fullServiceResponse[index].product,
      port: checkedPort,
      protocol: this.fullServiceResponse[index].protocol,
    };
    this.selectedPortMapping.mappedPorts.push(mappedPorts);
    // moving the logic to the data service

    // this.selectedPortMapping.totalMappedPorts =
    //   this.selectedPortMapping.mappedPorts.length;
    // let servers = this.selectedPortMapping.mappedPorts.map(
    //   (mappedPort) => mappedPort.targetServerName
    // );
    // this.selectedPortMapping.totalMappedServers = Array.from(
    //   new Set(servers)
    // ).length;
  }

  // Save the mapping trigged by the save button
  saveMapping() {
    this.dataService.updatePortMapping(
      this.selectedPortMapping,
      this.selectedPortMapping.id
    );
    this.router.navigate(['']);
  }

  // Remove the service from the mapped triggered by the remove button
  removeService(index: number) {
    this.selectedPortMapping.mappedPorts.splice(index, 1);
  }

  // Change the application
  changeApp(selectedProduct: string) {
    this.fullServiceResponse = [];
    this.sourceServiceName = '';
    this.getSourceData();
  }

  private getApps() {
    this.httpService.getApps().subscribe((data) => {
      this.products = data;
    });
  }

  private getSourceData() {
    const selectedProduct: Product = { productName: this.selectedProduct };
    this.httpService.getSource(selectedProduct).subscribe((data) => {
      this.sourceServices = data;
    });
  }

  // Update the server name in the port mapping component
  updateName(newName: string) {
    this.checkServerName(newName);
    if (this.repeatServerName) {
      return;
    }
    this.dataService.updateName(newName, this.id);
    this.selectedPortMapping.sourceServer = newName;
    this.servers = this.dataService.getServers();
  }

  // Check if the server name is repeated
  checkServerName(name: string) {
    const serverNames = this.servers.map((server) => server.name);
    if (
      serverNames.includes(name) &&
      name !== this.selectedPortMapping.sourceServer
    ) {
      this.repeatServerName = true;
    } else {
      this.repeatServerName = false;
    }
  }

  // Updates the target port mapping server name
  updateTargetPortmapping() {
    const servers = this.selectedPortMapping.mappedPorts.map(
      (mappedPort) => mappedPort.targetServerName
    );
    this.selectedPortMapping.totalMappedServers = Array.from(
      new Set(servers)
    ).length;
  }

}
