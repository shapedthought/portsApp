import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('defaults to the Ops theme and applies it to the root element', () => {
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    expect(service.theme()).toBe('ops');
    expect(document.documentElement.dataset['theme']).toBe('ops');
  });

  it('restores a saved theme and ignores unknown values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'blueprint');
    expect(TestBed.inject(ThemeService).theme()).toBe('blueprint');

    TestBed.resetTestingModule();
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(TestBed.inject(ThemeService).theme()).toBe('ops');
  });

  it('persists the chosen theme and switches captions', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('sheet');
    TestBed.tick();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('sheet');
    expect(document.documentElement.dataset['theme']).toBe('sheet');
    expect(service.copy().map).toBe('Fig. 1 · Network map');
  });
});
