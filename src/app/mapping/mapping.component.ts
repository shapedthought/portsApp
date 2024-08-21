import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MappedPorts, MappedServices, PortMapping, Product, Service, TargetServices } from '../services';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../data.service';
import { HttpService } from '../http.service';

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
  serverName = '';
  selectedProduct = '';
  selectedTargetServer = '';
  disableNameChange = false;
  route: ActivatedRoute = inject(ActivatedRoute);
  servers = [
    {id: 0, name: 'server 1'}
  ]

  products: Product[] = []

  sourceServices: Service[] = [];

  sourceServiceName: string = '';
  targetServices: TargetServices[] = []
  mappedServices: MappedServices[] = []

  portMapping: PortMapping[] = [];
  selectedPortMapping: PortMapping = {
    id: 0,
    sourceServer: '',
    totalMappedPorts: 0,
    totalMappedServers: 0,
    mappedPorts: []
  };

  selectService(index: number) {
    this.targetServices = [];
    this.sourceServiceSelected = index;
    this.sourceServiceName = this.sourceServices[index].name;

    this.targetServices = this.sourceServices[index].targetServices;
  }

  addService(index: number) {
    let mappedPorts: MappedPorts = {
      targetServerId: 'avecddf',
      targetServerName: this.selectedTargetServer,
      sourceService: this.sourceServiceName,
      targetService: this.targetServices[index].targetService,
      description: 'description',
      product: this.selectedProduct,
      fromPort: '123',
      toPort: '345',
      protocol: 'TCP'
    };
    this.selectedPortMapping.mappedPorts.push(mappedPorts);
  }

  removeService(index: number) {
    this.selectedPortMapping.mappedPorts.splice(index, 1);
  }

  changeApp(selectedProduct: string) {
    console.log('selectedProduct: ' + selectedProduct);
    this.getSourceData();
  }

  dataService: DataService = inject(DataService);
  httpService: HttpService = inject(HttpService);

  ngOnInit() { 
    this.portMapping = this.dataService.getMappedPorts();

    const idParam = this.route.snapshot.params['id'];
    if (idParam == "new") {
      this.id = -1;
    } else {
      // Get the ID
      this.id = parseInt(idParam)
      // Get the port mappings based on the ID
      this.selectedPortMapping = this.portMapping[this.id];
      console.log(this.selectedPortMapping);

      // Get the  server name from the port mapping
      this.serverName = this.selectedPortMapping.sourceServer;

      this.selectedProduct = this.selectedPortMapping.mappedPorts[0].product;
      console.log('selectedProduct: ' + this.selectedProduct);
      // Get a the list of servers from the port mapping
      let id = 0;
      // this.servers = this.servers.map((server) => {
      //   return {id: id++, name: server.name}
      // }
    // );
  }

  // Diable the name change if the ID is greater than -1
  if (this.id > -1) {
    this.disableNameChange = true;
  }
  // if (this.products.length > 0) {
  //   this.selectedProduct = this.products[0].productName;
  //   console.log('selectedProduct: ' + this.selectedProduct);
  // }
  // if (this.servers.length > 0) {
  //   this.selectedTargetServer = this.servers[0].name;
  // }

  this.getApps();

  this.getSourceData();
  }

  constructor(
  ) { 

  }

  private getApps() {
    this.httpService.getApps().subscribe((data) => {
      console.log(data);
      let index = 0;
      let indexdData = data.map((product) => {
        return { id: index++, productName: product };
      });
      this.products = indexdData;
    });
  }

  private getSourceData() {
    const selectedProduct: Product = { productName: this.selectedProduct };
    this.httpService.getSource(selectedProduct).subscribe((data) => {
      console.log(data);
      let index = 0;
      let indexdData = data.map((service) => {
        return { id: index++, name: service, targetServices: [] };
      });
      this.sourceServices = indexdData;
    });
  }
}
