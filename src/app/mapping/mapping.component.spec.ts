import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService, ConfirmationService } from 'primeng/api';
import { MappingComponent } from './mapping.component';
import { of } from 'rxjs';
import { HttpService } from '../http.service';
import { FullServiceResponse, Service } from '../services';

describe('MappingComponent', () => {
  let component: MappingComponent;
  let fixture: ComponentFixture<MappingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MappingComponent],
      providers: [
        MessageService,
        ConfirmationService,
        provideHttpClient(),
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: 'test-id' } }, params: of({ id: 'test-id' }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('with filters active', () => {
    const target = (id: number, targetService: string, protocol: string, port: string): FullServiceResponse => ({
      id, product: 'VBR', sourceService: 'Backup server', targetService, protocol, port,
      description: `${targetService} description`, subheading: 'Core', subheadingL2: '', subheadingL3: '',
    });

    beforeEach(() => {
      component.selectedTargetServer = 'Proxy';
      component.serverForm.controls.serverName.setValue('VBR');
      component.fullServiceResponse = [target(1, 'SMB share', 'TCP', '445'), target(2, 'DNS', 'UDP', '53')];
      component.onProtocolFilterChange('UDP');
    });

    it('adds the clicked target, not the one at the same unfiltered index', () => {
      component.updateService(component.filteredTargetServices[0]);
      const added = component.selectedPortMapping.mappedPorts;
      expect(added.map(m => [m.targetService, m.port, m.protocol])).toEqual([['DNS', '53', 'UDP']]);
    });

    it('describes the clicked target', () => {
      component.updateDescription(component.filteredTargetServices[0]);
      expect(component.selectedDescription).toBe('DNS description');
    });

    it('loads targets for the clicked source service', () => {
      const http = TestBed.inject(HttpService);
      const spy = vi.spyOn(http, 'getTarget').mockReturnValue(of([]));
      const services: Service[] = [
        { id: 1, name: 'Backup server', product: 'VBR', subheading: 'Core', targetServices: [] },
        { id: 2, name: 'Proxy', product: 'VBR', subheading: 'Data', targetServices: [] },
      ];
      component.sourceServices = services;
      component.searchTerm = 'proxy';
      component.applyFilters();
      component.selectService(component.filteredSourceServices[0]);
      expect(spy).toHaveBeenCalledWith(component.selectedProduct, 'Proxy', 'Data');
      expect(component.selectedSourceService).toBe(services[1]);
    });
  });
});
