import { Injectable, computed, effect, signal } from '@angular/core';

export type Theme = 'ops' | 'sheet' | 'blueprint';

export const THEMES: { key: Theme; label: string }[] = [
  { key: 'ops', label: 'Ops' },
  { key: 'sheet', label: 'Datasheet' },
  { key: 'blueprint', label: 'Blueprint' },
];

export const THEME_STORAGE_KEY = 'portsapp-redesign-theme';

/** Section captions that change with the theme. */
export interface ThemeCopy {
  dashKicker: string;
  mapKicker: string;
  reportKicker: string;
  mappingKicker: string;
  mcpKicker: string;
  list: string;
  map: string;
  mappingsTable: string;
  diagram: string;
}

const COPY: Record<Theme, ThemeCopy> = {
  ops: {
    dashKicker: '~/portsapp/servers',
    mapKicker: '~/portsapp/topology',
    reportKicker: '~/portsapp/report',
    mappingKicker: '~/portsapp/servers/edit',
    mcpKicker: '~/portsapp/mcp',
    list: '// servers',
    map: '// topology',
    mappingsTable: '// mappings',
    diagram: '// diagram',
  },
  sheet: {
    dashKicker: 'Section 1 — Servers',
    mapKicker: 'Section 2 — Topology',
    reportKicker: 'Section 3 — Report',
    mappingKicker: 'Section 1.1 — Edit server',
    mcpKicker: 'Appendix A — MCP',
    list: 'Table 1 · Configured servers',
    map: 'Fig. 1 · Network map',
    mappingsTable: 'Table 2 · Port mappings',
    diagram: 'Fig. 2 · Mermaid diagram',
  },
  blueprint: {
    dashKicker: 'Dashboard',
    mapKicker: 'Topology',
    reportKicker: 'Report',
    mappingKicker: 'Edit server',
    mcpKicker: 'MCP',
    list: 'Servers',
    map: 'Network map',
    mappingsTable: 'Port mappings',
    diagram: 'Diagram',
  },
};

function isTheme(value: string | null): value is Theme {
  return THEMES.some(t => t.key === value);
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.load());
  readonly copy = computed(() => COPY[this.theme()]);

  constructor() {
    effect(() => {
      document.documentElement.dataset['theme'] = this.theme();
    });
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage unavailable (private mode); the choice lasts for this session only.
    }
  }

  private load(): Theme {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return isTheme(saved) ? saved : 'ops';
    } catch {
      return 'ops';
    }
  }
}
