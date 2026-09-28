import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        MessageService,
        ConfirmationService,
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'PortsApp - Modern Network Port Management' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('PortsApp - Modern Network Port Management');
  });

  it('should set seen flag on first visit and not show promo', () => {
    localStorage.clear();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    expect(localStorage.getItem('portsapp-mcp-promo-seen')).toBe('1');
    expect(app.showMcpPromo).toBe(false);
  });

  it('should show promo on second visit when not dismissed', () => {
    localStorage.clear();
    localStorage.setItem('portsapp-mcp-promo-seen', '1');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    expect(app.showMcpPromo).toBe(true);
  });

  it('should not show promo when dismissed', () => {
    localStorage.clear();
    localStorage.setItem('portsapp-mcp-promo-seen', '1');
    localStorage.setItem('portsapp-mcp-promo-dismissed', '1');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    expect(app.showMcpPromo).toBe(false);
  });
});
