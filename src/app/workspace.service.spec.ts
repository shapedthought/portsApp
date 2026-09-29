import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';
import { createTestMappedPort, createTestPortMapping } from './testing/test-utils';
import { WorkspaceService } from './workspace.service';

describe('WorkspaceService', () => {
  let ws: WorkspaceService;
  let data: DataService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    ws = TestBed.inject(WorkspaceService);
    data = TestBed.inject(DataService);
    data.mappedPorts.set([
      createTestPortMapping({
        id: 'a',
        sourceServer: 'VBR',
        mappedPorts: [createTestMappedPort({ targetServerName: 'Proxy', port: '445', protocol: 'TCP' })],
      }),
      createTestPortMapping({ id: 'b', sourceServer: 'Proxy', mappedPorts: [] }),
    ]);
  });

  it('defaults to the first configured server', () => {
    expect(ws.selection()).toEqual({ type: 'node', id: 'VBR' });
  });

  it('keeps the selected server across modes', () => {
    ws.select({ type: 'node', id: 'Proxy' });
    ws.mode.set('map');
    expect(ws.selection()).toEqual({ type: 'node', id: 'Proxy' });
  });

  it('allows connection and empty selections only in Map mode', () => {
    ws.mode.set('map');
    ws.select({ type: 'edge', id: 'VBR|Proxy' });
    expect(ws.detail().kind).toBe('edge');
    ws.select({ type: 'none' });
    expect(ws.detail().kind).toBe('none');

    ws.mode.set('dash');
    expect(ws.selection()).toEqual({ type: 'node', id: 'VBR' });
  });

  it('falls back when the selected server is deleted', () => {
    ws.select({ type: 'node', id: 'Proxy' });
    data.deleteServer('b');
    // Proxy is still referenced as a target, so it stays on the map as an unconfigured server.
    expect(ws.selection()).toEqual({ type: 'node', id: 'Proxy' });
    data.deleteAll();
    expect(ws.selection()).toEqual({ type: 'node', id: 'Server 1' });
  });

  it('builds detail groups for the chosen direction', () => {
    ws.select({ type: 'node', id: 'Proxy' });
    ws.direction.set('in');
    const detail = ws.detail();
    expect(detail.kind === 'node' && detail.groups.map(g => g.peer)).toEqual(['VBR']);
  });
});
