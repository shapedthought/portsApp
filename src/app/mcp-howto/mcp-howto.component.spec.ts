import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { McpHowtoComponent } from './mcp-howto.component';

describe('McpHowtoComponent', () => {
  let fixture: ComponentFixture<McpHowtoComponent>;
  let messages: MessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [McpHowtoComponent], providers: [MessageService] });
    messages = TestBed.inject(MessageService);
    fixture = TestBed.createComponent(McpHowtoComponent);
    fixture.detectChanges();
  });

  it('lists every client setup and tool', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect([...el.querySelectorAll('.client-name')].map(h => h.textContent?.trim())).toEqual([
      'Claude Desktop',
      'Claude Code / VS Code',
      'Cursor',
    ]);
    expect(el.querySelectorAll('tbody tr').length).toBe(fixture.componentInstance.tools.length);
  });

  it('copies a code block and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const add = vi.spyOn(messages, 'add');

    (fixture.nativeElement.querySelector('[aria-label="Copy Claude Code command"]') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(fixture.componentInstance.claudeCodeCommand);
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });
});
