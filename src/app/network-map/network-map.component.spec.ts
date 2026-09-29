import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NetworkMapComponent } from './network-map.component';
import { DataService } from '../data.service';
import { WorkspaceService } from '../workspace.service';
import { createTestMappedPort, createTestPortMapping } from '../testing/test-utils';

describe('NetworkMapComponent', () => {
  let fixture: ComponentFixture<NetworkMapComponent>;
  let ws: WorkspaceService;
  let el: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [NetworkMapComponent] });
    TestBed.inject(DataService).mappedPorts.set([
      createTestPortMapping({
        id: 'a',
        sourceServer: 'VBR',
        mappedPorts: [
          createTestMappedPort({ targetServerName: 'Proxy', port: '445, 135, 6160, 6162', protocol: 'TCP' }),
          createTestMappedPort({ targetServerName: 'DNS', port: '53', protocol: 'UDP' }),
        ],
      }),
      createTestPortMapping({ id: 'b', sourceServer: 'Proxy' }),
      createTestPortMapping({ id: 'c', sourceServer: 'Spare' }),
    ]);
    ws = TestBed.inject(WorkspaceService);
    ws.mode.set('map');
    fixture = TestBed.createComponent(NetworkMapComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('draws a node per server and a labelled edge per connection', () => {
    expect(el.querySelectorAll('.node').length).toBe(4);
    expect(el.querySelectorAll('.edges path').length).toBe(2);
    const labels = [...el.querySelectorAll('.edge-label')].map(l => l.textContent?.replace(/\s+/g, ' ').trim());
    expect(labels).toEqual(['→TCP445 135 6160 +1', '→UDP53']);
    expect(el.querySelectorAll('.edges path[stroke-dasharray]').length).toBe(1);
  });

  it('fades servers not linked to the selection', () => {
    const faded = [...el.querySelectorAll('.node.faded .node-name')].map(n => n.textContent?.trim());
    expect(faded).toEqual(['Spare']);
  });

  it('selects nodes and edges, and clears on empty canvas clicks', () => {
    (el.querySelectorAll('.edge-label')[1] as HTMLButtonElement).click();
    expect(ws.selection()).toEqual({ type: 'edge', id: 'VBR|DNS' });

    (el.querySelector('.canvas') as HTMLElement).click();
    expect(ws.selection()).toEqual({ type: 'none' });
  });

  it('dims edges filtered out by protocol and can hide port numbers', () => {
    ws.protocolFilter.set('UDP');
    ws.showPortNumbers.set(false);
    fixture.detectChanges();
    const labels = el.querySelectorAll<HTMLElement>('.edge-label');
    expect(labels[0].style.getPropertyValue('--fade')).toBe('0.12');
    expect(labels[0].textContent).toContain('4 ports');
  });
});
