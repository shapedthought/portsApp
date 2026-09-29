import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { version } from '../../package.json';
import { THEMES, ThemeService } from './theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast, ConfirmDialog, Dialog, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'PortsApp - Modern Network Port Management';
  readonly version = version;
  readonly themes = THEMES;
  readonly themeService = inject(ThemeService);

  showMcpPromo = false;
  dontShowAgain = false;

  private readonly SEEN_KEY = 'portsapp-mcp-promo-seen';
  private readonly DISMISSED_KEY = 'portsapp-mcp-promo-dismissed';
  private promoClosing = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.maybeShowMcpPromo();
  }

  private maybeShowMcpPromo(): void {
    const seen = localStorage.getItem(this.SEEN_KEY);
    const dismissed = localStorage.getItem(this.DISMISSED_KEY) === '1';

    if (!seen) {
      // First visit: mark seen, do not show promo yet
      localStorage.setItem(this.SEEN_KEY, '1');
      return;
    }

    // Second+ visit: show unless permanently dismissed
    if (!dismissed) {
      this.showMcpPromo = true;
    }
  }

  /** Soft close (Maybe later / X / mask). Permanent only if checkbox checked. */
  closeMcpPromo(): void {
    if (this.promoClosing) {
      return;
    }
    this.promoClosing = true;
    if (this.dontShowAgain) {
      localStorage.setItem(this.DISMISSED_KEY, '1');
    }
    this.showMcpPromo = false;
    this.dontShowAgain = false;
    this.promoClosing = false;
  }

  learnMoreMcp(): void {
    if (this.promoClosing) {
      return;
    }
    this.promoClosing = true;
    if (this.dontShowAgain) {
      localStorage.setItem(this.DISMISSED_KEY, '1');
    }
    this.showMcpPromo = false;
    this.dontShowAgain = false;
    this.promoClosing = false;
    this.router.navigate(['/mcp']);
  }
}
