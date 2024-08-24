import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FullServiceResponse, MappedPorts, MappedServices, PortMapping, Product, Server, Service, TargetServices } from '../services';
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
  styleUrl: './mapping.component.css'
})
export class MappingComponent {

  id = 0;
  sourceServiceSelected = 0;
  serverName = 'Change me';
  selectedProduct = '';
  selectedTargetServer = '';
  disableNameChange = false;
  servers: Server[] = [
    {id: 0, name: 'server 1'}
  ]
  products: Product[] = []
  sourceServices: Service[] = [];
  sourceServiceName: string = '';
  fullServiceResponse: FullServiceResponse[] = [];  
  targetServices: TargetServices[] = []
  mappedServices: MappedServices[] = []
  portMapping: PortMapping[] = [];
  selectedPortMapping: PortMapping = {
    id: 1,
    sourceServer: '',
    totalMappedPorts: 0,
    totalMappedServers: 0,
    mappedPorts: []
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private httpService: HttpService
  ) { 

  }

  ngOnInit() { 
    
    const idParam = this.route.snapshot.params['id'];
    this.portMapping = this.dataService.getMappedPorts();

    if (idParam == "new") {
      this.id = -1;

      this.portMapping = this.dataService.addNewServer("Change me");
      this.selectedPortMapping = this.portMapping[this.portMapping.length - 1];
      this.servers = this.dataService.getServers();
      this.selectedTargetServer = this.servers[0].name;
      this.selectedProduct = 'VB365';

    } else {
      this.portMapping = this.dataService.getMappedPorts();
      this.servers = this.dataService.getServers();
      
      // Get the ID
      this.id = parseInt(idParam)

      // Get the port mappings based on the ID
      this.selectedPortMapping = this.portMapping[this.id];
      console.log(this.selectedPortMapping);

      // Get the  serv=er name from the port mapping
      this.serverName = this.selectedPortMapping.sourceServer;

      this.selectedTargetServer = this.servers[0].name;

      if (this.serverName == this.selectedTargetServer) { 
        // If the server name is the same as the target server, then select the other server
        this.selectedTargetServer = this.servers.filter(server => server.name !== this.serverName)[0].name;
      }


      this.selectedProduct = this.selectedPortMapping.mappedPorts.length > 0 ? this.selectedPortMapping.mappedPorts[0].product : 'VB365';
      console.log('selectedProduct: ' + this.selectedProduct);

  }

  this.getApps();
  this.getSourceData();
  }

  selectService(index: number) {
    this.httpService.getTarget(this.selectedProduct, this.sourceServices[index].name).subscribe((data) => {
      console.log(data);
      this.targetServices = [];
      this.fullServiceResponse = data;
      this.sourceServiceName = this.sourceServices[index].name
      this.sourceServiceSelected = index; 
      // this.targetServices = this.fullServiceResponse[0].productName;
    });
  }
  // Updates 
  updateService(index: number) {
    let mappedPorts: MappedPorts = {
      targetServerId: this.selectedPortMapping.id,
      targetServerName: this.selectedTargetServer,
      sourceService: this.sourceServiceName,
      targetService: this.fullServiceResponse[index].toPort,
      description: this.fullServiceResponse[index].description,
      product: this.fullServiceResponse[index].product,
      port: this.fullServiceResponse[index].port,
      protocol: this.fullServiceResponse[index].protocol
    };
    this.selectedPortMapping.mappedPorts.push(mappedPorts);
    this.selectedPortMapping.totalMappedPorts = this.selectedPortMapping.mappedPorts.length;
    let servers = this.selectedPortMapping.mappedPorts.map(mappedPort => mappedPort.targetServerName);
    this.selectedPortMapping.totalMappedServers = Array.from(new Set(servers)).length;
  }

  saveMapping() {
    if (this.id == -1) {
      // this.dataService.addPortMapping(this.selectedPortMapping);
    } else {
      this.dataService.updatePortMapping(this.selectedPortMapping, this.selectedPortMapping.id);
    }

    this.router.navigate(['']);
  }

  removeService(index: number) {
    this.selectedPortMapping.mappedPorts.splice(index, 1);
  }

  changeApp(selectedProduct: string) {
    this.fullServiceResponse = [];
    this.sourceServiceName = '';
    console.log('selectedProduct: ' + selectedProduct);
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

  updateName(newName: string) {
    this.selectedPortMapping.sourceServer = newName;
    this.dataService.updateName(newName, this.id);
    this.servers = this.dataService.getServers();
  }

}
