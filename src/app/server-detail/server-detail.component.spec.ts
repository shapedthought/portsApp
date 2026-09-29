import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { ServerDetailComponent } from './server-detail.component';
import { DataService } from '../data.service';
import { WorkspaceService } from '../workspace.service';
import { createTestMappedPort, createTestPortMapping } from '../testing/test-utils';

describe('ServerDetailComponent', () => {
  let fixture: ComponentFixture<ServerDetailComponent>;
  let ws: WorkspaceService;
  let el: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [ServerDetailComponent], providers: [MessageService] });
    TestBed.inject(DataService).mappedPorts.set([
      createTestPortMapping({
        id: 'a',
        sourceServer: 'VBR',
        mappedPorts: [
          createTestMappedPort({ targetServerName: 'Proxy', targetService: 'Proxy service', port: '445, 2500-3300', protocol: 'TCP' }),
          createTestMappedPort({ targetServerName: 'DNS', targetService: 'DNS server', port: '53', protocol: 'UDP' }),
        ],
      }),
    ]);
    ws = TestBed.inject(WorkspaceService);
    fixture = TestBed.createComponent(ServerDetailComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('shows the selected server grouped by peer', () => {
    expect(el.querySelector('.name')?.textContent).toContain('VBR');
    const peers = [...el.querySelectorAll('.peer')].map(p => p.textContent?.trim());
    expect(peers).toEqual(['Proxy', 'DNS']);
    const chips = [...el.querySelectorAll('.pa-chip')].map(c => c.textContent?.trim());
    expect(chips).toEqual(['445', '2500–3300', '53']);
  });

  it('shows an empty message for a direction with no mappings', () => {
    ws.direction.set('in');
    fixture.detectChanges();
    expect(el.querySelector('.empty')?.textContent).toContain('No inbound mappings for this server.');
  });

  it('shows a connection when an edge is selected in Map mode', () => {
    ws.mode.set('map');
    ws.select({ type: 'edge', id: 'VBR|Proxy' });
    fixture.detectChanges();
    expect(el.querySelector('.pa-caption')?.textContent).toContain('Connection');
    expect(el.querySelector('.summary')?.textContent).toContain('TCP · 2 unique ports · 1 service');
  });

  it('builds firewall port lists with plain hyphen ranges', () => {
    expect(fixture.componentInstance.firewallPorts()).toEqual({ tcp: '445,2500-3300', udp: '53' });
  });

  it('emits actions for the selected server', () => {
    const renamed: string[] = [];
    fixture.componentInstance.rename.subscribe(s => renamed.push(s.name));
    (el.querySelector('[title="Rename"]') as HTMLButtonElement).click();
    expect(renamed).toEqual(['VBR']);
  });
});
