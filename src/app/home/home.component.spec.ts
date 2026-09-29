import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { HomeComponent } from './home.component';
import { DataService } from '../data.service';
import { WorkspaceService } from '../workspace.service';
import { createTestMappedPort, createTestPortMapping } from '../testing/test-utils';

function setup(mode: 'dash' | 'map'): ComponentFixture<HomeComponent> {
  localStorage.clear();
  localStorage.setItem(
    'portMapping',
    JSON.stringify([
      createTestPortMapping({
        id: 'a',
        sourceServer: 'VBR',
        mappedPorts: [createTestMappedPort({ targetServerName: 'Proxy', port: '445, 135', protocol: 'TCP' })],
      }),
      createTestPortMapping({ id: 'b', sourceServer: 'Proxy' }),
    ]),
  );
  TestBed.configureTestingModule({
    imports: [HomeComponent],
    providers: [
      MessageService,
      ConfirmationService,
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { mode } } } },
    ],
  });
  const fixture = TestBed.createComponent(HomeComponent);
  fixture.detectChanges();
  return fixture;
}

describe('HomeComponent', () => {
  it('renders the stat strip and the server table in Dashboard mode', () => {
    const fixture = setup('dash');
    const el: HTMLElement = fixture.nativeElement;
    const stats = [...el.querySelectorAll('.stat-value')].map(s => s.textContent?.trim());
    expect(stats).toEqual(['2', '1', '2', '2', '0']);
    const rows = el.querySelectorAll('.server-row');
    expect(rows.length).toBe(2);
    expect(rows[0].classList).toContain('selected');
    expect(el.querySelector('app-network-map')).toBeNull();
  });

  it('selects a server when its row is clicked', () => {
    const fixture = setup('dash');
    const rows = fixture.nativeElement.querySelectorAll('.server-row');
    rows[1].click();
    fixture.detectChanges();
    expect(TestBed.inject(WorkspaceService).selection()).toEqual({ type: 'node', id: 'Proxy' });
    expect(rows[1].classList).toContain('selected');
  });

  it('renders the map in Map mode', () => {
    const fixture = setup('map');
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-network-map')).not.toBeNull();
    expect(el.querySelector('.page-title')?.textContent).toContain('Network map');
  });

  it('keeps the renamed server selected', () => {
    const fixture = setup('dash');
    const component = fixture.componentInstance;
    const ws = TestBed.inject(WorkspaceService);
    component.openRenameModal(ws.servers()[0]);
    component.renameServerName = 'Backup';
    component.submitRenameModal();
    expect(TestBed.inject(DataService).mappedPorts()[0].sourceServer).toBe('Backup');
    expect(ws.selection()).toEqual({ type: 'node', id: 'Backup' });
  });

  it('refuses invalid or duplicate server names', () => {
    const fixture = setup('dash');
    const component = fixture.componentInstance;
    component.serverName = 'ab';
    component.submitModal();
    component.serverName = 'Proxy';
    component.checkServerName('Proxy');
    component.submitModal();
    expect(TestBed.inject(DataService).mappedPorts().length).toBe(2);
  });
});
