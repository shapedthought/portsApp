import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ReportComponent } from './report.component';
import { createTestMappedPort, createTestPortMapping } from '../testing/test-utils';

describe('ReportComponent', () => {
  let component: ReportComponent;
  let fixture: ComponentFixture<ReportComponent>;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem(
      'portMapping',
      JSON.stringify([
        createTestPortMapping({
          id: 'a',
          sourceServer: 'VBR',
          mappedPorts: [
            createTestMappedPort({ targetServerName: 'Proxy', port: '445, 2500-3300', protocol: 'TCP' }),
            createTestMappedPort({ targetServerName: 'DNS', port: '53', protocol: 'UDP' }),
          ],
        }),
      ]),
    );

    await TestBed.configureTestingModule({
      imports: [ReportComponent],
      providers: [MessageService, ConfirmationService, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('summarises mappings, source servers and each protocol', () => {
    const el: HTMLElement = fixture.nativeElement;
    const stats = [...el.querySelectorAll('.pa-stat')].map(s => [
      s.querySelector('.pa-stat-label')?.textContent?.trim(),
      s.querySelector('.pa-stat-value')?.textContent?.trim(),
    ]);
    expect(stats).toEqual([['Mappings', '2'], ['Source servers', '1'], ['TCP', '1'], ['UDP', '1']]);
  });

  it('shows each mapping’s ports as chips', () => {
    const el: HTMLElement = fixture.nativeElement;
    const chips = [...el.querySelectorAll('tbody .pa-chip')].map(c => c.textContent?.trim());
    expect(chips).toEqual(['445', '2500–3300', '53']);
  });

  it('switches to the diagram view', () => {
    component.toggleView('diagram');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-diagram')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('p-table')).toBeNull();
  });
});
