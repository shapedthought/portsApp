import { Component } from '@angular/core';
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
  createDefaultPortMapping,
} from '../services';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { DataService } from '../data.service';
import { HttpService } from '../http.service';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Stepper, StepList, Step, StepPanels, StepPanel } from 'primeng/stepper';

@Component({
  selector: 'app-mapping',
  imports: [FormsModule, ReactiveFormsModule, RouterLink, Stepper, StepList, Step, StepPanels, StepPanel],
  templateUrl: './mapping.component.html',
  styleUrl: './mapping.component.css',
})
export class MappingComponent {
  id: string = '';
  sourceServiceSelected = 0;
  selectedTargetServer = '';
  servers: Server[] = [{ id: 0, name: 'server 1' }];
  products: Product[] = [];
  sourceServices: Service[] = [];
  sourceServiceName: string = '';
  fullServiceResponse: FullServiceResponse[] = [];
  targetServices: TargetServices[] = [];
  mappedServices: MappedServices[] = [];
  portMapping: PortMapping[] = [];
  selectedPortMapping: PortMapping = createDefaultPortMapping('', '');
  selectedDescription = 'Click on The Service to see the description';
  private mappingsDirty = false;
  activeStep = 1;

  // Reactive form for server configuration
  serverForm = new FormGroup({
    serverName: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(20),
      this.uniqueServerNameValidator.bind(this),
    ]),
    selectedProduct: new FormControl('VB365'),
  });

  // Filter Properties (kept as plain properties — not part of saved form)
  searchTerm: string = '';
  protocolFilter: 'ALL' | 'TCP' | 'UDP' = 'ALL';
  categoryFilter: string = '';

  // Computed Properties
  filteredSourceServices: Service[] = [];
  filteredTargetServices: FullServiceResponse[] = [];
  availableCategories: string[] = [];

  // Debounce timer
  private searchTimeout: any;

  get hasUnsavedChanges(): boolean {
    return this.serverForm.dirty || this.mappingsDirty;
  }

  get canProceedToStep2(): boolean {
    return this.serverForm.get('serverName')!.valid;
  }

  get canProceedToStep3(): boolean {
    return this.selectedPortMapping.mappedPorts.length > 0;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private httpService: HttpService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  // Custom validator for unique server name
  uniqueServerNameValidator(control: AbstractControl): ValidationErrors | null {
    if (!this.dataService || !this.selectedPortMapping) return null;
    const name = control.value;
    const servers = this.dataService.servers();
    const isDuplicate = servers.some(
      s => s.name === name && name !== this.selectedPortMapping.sourceServer
    );
    return isDuplicate ? { uniqueName: true } : null;
  }

  ngOnInit() {
    this.dataService.loadPortMapping();
    const idParam = this.route.snapshot.params['id'];
    this.portMapping = this.dataService.mappedPorts();
    this.servers = this.dataService.servers();

    // Get the ID (UUID string)
    this.id = idParam;

    // Get the port mapping by UUID
    const found = this.portMapping.find(pm => pm.id === this.id);
    if (!found) {
      this.router.navigate(['']);
      return;
    }
    this.selectedPortMapping = found;

    // Initialize form with loaded values
    const serverName = this.selectedPortMapping.sourceServer;
    const product = this.selectedPortMapping.mappedPorts.length > 0
      ? this.selectedPortMapping.mappedPorts[0].product
      : 'VB365';

    this.serverForm.patchValue({
      serverName,
      selectedProduct: product,
    });
    // Reset dirty state after patching initial values
    this.serverForm.markAsPristine();

    this.selectedTargetServer = this.servers[0].name;

    if (serverName == this.selectedTargetServer) {
      this.selectedTargetServer = this.servers.filter(
        (server) => server.name !== serverName
      )[0].name;
    }

    this.getApps();
    this.getSourceData();
    this.loadFilterState();
  }

  get serverName(): string {
    return this.serverForm.get('serverName')!.value || '';
  }

  get selectedProduct(): string {
    return this.serverForm.get('selectedProduct')!.value || '';
  }

  selectService(index: number) {
    this.httpService
      .getTarget(
        this.selectedProduct,
        this.sourceServices[index].name,
        this.sourceServices[index].subheading
      )
      .subscribe((data) => {
        this.targetServices = [];
        this.fullServiceResponse = data;
        this.sourceServiceName = this.sourceServices[index].name;
        this.sourceServiceSelected = index;
        this.updateAvailableCategories();
        this.applyFilters();
      });
  }

  updateDescription(index: number) {
    this.selectedDescription = this.fullServiceResponse[index].description;
  }

  splitAndAddComma(port: string): string {
    if (port.includes(',')) {
      return port;
    } else if (port.includes('(')) {
      const parts = port.split('(');
      return parts[0].trim();
    } else if (port.includes('to')) {
      return port.replace('to', '-').replaceAll(' ', '');
    }

    const parts = port.split(' ');
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
        mappedPort.targetService ===
          this.fullServiceResponse[index].targetService &&
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
    const checkedPort = this.splitAndAddComma(
      this.fullServiceResponse[index].port
    );
    let mappedPorts: MappedPorts = {
      sourceServerId: this.id,
      sourceServerName: this.serverName,
      targetServerName: this.selectedTargetServer,
      sourceService: this.sourceServiceName,
      targetService: this.fullServiceResponse[index].targetService,
      description: this.fullServiceResponse[index].description,
      product: this.fullServiceResponse[index].product,
      port: checkedPort,
      protocol: this.fullServiceResponse[index].protocol,
    };
    this.selectedPortMapping.mappedPorts.push(mappedPorts);
    this.mappingsDirty = true;
    this.messageService.add({
      severity: 'success',
      summary: 'Port Mapping Added',
      detail: `${mappedPorts.sourceService} → ${mappedPorts.targetService} (${mappedPorts.port} ${mappedPorts.protocol})`,
    });
  }

  // Save the mapping triggered by the save button
  saveMapping() {
    // Sync form values to port mapping
    this.selectedPortMapping.sourceServer = this.serverName;
    this.dataService.updatePortMapping(this.selectedPortMapping);
    this.serverForm.markAsPristine();
    this.mappingsDirty = false;
    this.router.navigate(['']);
  }

  // Remove the service from the mapped triggered by the remove button
  removeService(index: number) {
    const mapping = this.selectedPortMapping.mappedPorts[index];
    this.confirmationService.confirm({
      header: 'Remove Port Mapping',
      message: `Remove ${mapping.sourceService} → ${mapping.targetService} (${mapping.port} ${mapping.protocol})?`,
      acceptLabel: 'Remove',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.selectedPortMapping.mappedPorts.splice(index, 1);
        this.mappingsDirty = true;
        this.messageService.add({
          severity: 'warn',
          summary: 'Port Mapping Removed',
          detail: `${mapping.sourceService} → ${mapping.targetService}`,
        });
      },
    });
  }

  // Change the application
  changeApp() {
    this.fullServiceResponse = [];
    this.sourceServiceName = '';
    this.availableCategories = [];
    this.clearAllFilters();
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
      this.applyFilters();
    });
  }

  // Update the server name in the port mapping component
  updateName() {
    const newName = this.serverName;
    const nameControl = this.serverForm.get('serverName')!;
    if (nameControl.invalid) {
      return;
    }
    this.dataService.updateName(newName, this.id);
    this.selectedPortMapping.sourceServer = newName;
    this.servers = this.dataService.servers();
  }

  // Updates the target port mapping server name
  updateTargetPortmapping() {
    const servers = this.selectedPortMapping.mappedPorts.map(
      (mappedPort) => mappedPort.targetServerName
    );
    this.selectedPortMapping.totalMappedServers = Array.from(
      new Set(servers)
    ).length;
    this.mappingsDirty = true;
  }

  // Confirm leave dialog for unsaved changes
  confirmLeave(): Promise<boolean> {
    return new Promise(resolve => {
      this.confirmationService.confirm({
        header: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to leave?',
        acceptLabel: 'Leave',
        rejectLabel: 'Stay',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }

  // === FILTERING METHODS ===

  // Apply all filters to both source and target services
  applyFilters(): void {
    this.filteredSourceServices = this.filterSourceServices();
    this.filteredTargetServices = this.filterTargetServices();
    this.saveFilterState();
  }

  // Filter source services based on search term
  filterSourceServices(): Service[] {
    if (!this.sourceServices) return [];

    return this.sourceServices.filter((service) => {
      const matchesSearch =
        this.searchTerm === '' ||
        service.subheading
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        service.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesSearch;
    });
  }

  // Filter target services based on all filter criteria
  filterTargetServices(): FullServiceResponse[] {
    if (!this.fullServiceResponse) return [];

    return this.fullServiceResponse.filter((service) => {
      // Search filter - check multiple fields
      const searchLower = this.searchTerm.toLowerCase();
      const matchesSearch =
        this.searchTerm === '' ||
        service.targetService.toLowerCase().includes(searchLower) ||
        service.subheading.toLowerCase().includes(searchLower) ||
        service.subheadingL2.toLowerCase().includes(searchLower) ||
        service.subheadingL3.toLowerCase().includes(searchLower) ||
        service.description.toLowerCase().includes(searchLower) ||
        service.port.toString().toLowerCase().includes(searchLower);

      // Protocol filter
      const matchesProtocol =
        this.protocolFilter === 'ALL' ||
        service.protocol === this.protocolFilter;

      // Category filter
      const matchesCategory =
        this.categoryFilter === '' ||
        service.subheading === this.categoryFilter;

      return matchesSearch && matchesProtocol && matchesCategory;
    });
  }

  // Update available categories from current target services
  updateAvailableCategories(): void {
    if (!this.fullServiceResponse) {
      this.availableCategories = [];
      return;
    }

    const categories = new Set(
      this.fullServiceResponse.map((s) => s.subheading)
    );
    this.availableCategories = Array.from(categories).sort();
  }

  // Event handlers for filter changes
  onSearchChange(event: any): void {
    const term = event.target.value;
    this.searchTerm = term;

    // Debounce search to avoid excessive filtering
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.applyFilters();
    }, 300);
  }

  onProtocolFilterChange(protocol: 'ALL' | 'TCP' | 'UDP'): void {
    this.protocolFilter = protocol;
    this.applyFilters();
  }

  onCategoryFilterChange(event: any): void {
    this.categoryFilter = event.target.value;
    this.applyFilters();
  }

  // Clear all filters
  clearAllFilters(): void {
    this.searchTerm = '';
    this.protocolFilter = 'ALL';
    this.categoryFilter = '';
    this.applyFilters();
  }

  // Check if any filters are active
  hasActiveFilters(): boolean {
    return (
      this.searchTerm !== '' ||
      this.protocolFilter !== 'ALL' ||
      this.categoryFilter !== ''
    );
  }

  // Get active filters for display
  getActiveFilters(): { key: string; label: string }[] {
    const filters: { key: string; label: string }[] = [];

    if (this.searchTerm !== '') {
      filters.push({ key: 'search', label: `Search: "${this.searchTerm}"` });
    }

    if (this.protocolFilter !== 'ALL') {
      filters.push({
        key: 'protocol',
        label: `Protocol: ${this.protocolFilter}`,
      });
    }

    if (this.categoryFilter !== '') {
      filters.push({
        key: 'category',
        label: `Category: ${this.categoryFilter}`,
      });
    }

    return filters;
  }

  // Remove specific filter
  removeFilter(filterKey: string): void {
    switch (filterKey) {
      case 'search':
        this.searchTerm = '';
        break;
      case 'protocol':
        this.protocolFilter = 'ALL';
        break;
      case 'category':
        this.categoryFilter = '';
        break;
    }
    this.applyFilters();
  }

  // Filter state persistence
  private readonly FILTER_STORAGE_KEY = 'portsapp-mapping-filters';

  saveFilterState(): void {
    const filterState = {
      searchTerm: this.searchTerm,
      protocolFilter: this.protocolFilter,
      categoryFilter: this.categoryFilter,
    };
    localStorage.setItem(this.FILTER_STORAGE_KEY, JSON.stringify(filterState));
  }

  loadFilterState(): void {
    try {
      const saved = localStorage.getItem(this.FILTER_STORAGE_KEY);
      if (saved) {
        const filterState = JSON.parse(saved);
        this.searchTerm = filterState.searchTerm || '';
        this.protocolFilter = filterState.protocolFilter || 'ALL';
        this.categoryFilter = filterState.categoryFilter || '';
      }
    } catch (error) {
      console.warn('Could not load filter state:', error);
    }
  }
}
