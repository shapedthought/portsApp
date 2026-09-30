import { Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Copy, LucideAngularModule } from 'lucide-angular';
import { MessageService } from 'primeng/api';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'app-mcp-howto',
  standalone: true,
  imports: [NgTemplateOutlet, LucideAngularModule],
  templateUrl: './mcp-howto.component.html',
  styleUrl: './mcp-howto.component.css',
})
export class McpHowtoComponent {
  readonly theme = inject(ThemeService);
  private readonly messageService = inject(MessageService);
  readonly icons = { Copy };

  readonly claudeDesktopConfig = `{
  "mcpServers": {
    "veeam-ports": {
      "command": "uvx",
      "args": ["veeam-ports-mcp"]
    }
  }
}`;

  readonly cursorMcpConfig = `{
  "mcpServers": {
    "veeam-ports": {
      "command": "uvx",
      "args": ["veeam-ports-mcp"]
    }
  }
}`;

  readonly claudeCodeCommand = 'claude mcp add veeam-ports -- uvx veeam-ports-mcp';

  readonly tools = [
    { name: 'list_products', desc: 'List all Veeam products with port data' },
    { name: 'list_services', desc: 'List service roles for a product (use before topology/import)' },
    { name: 'get_product_ports', desc: 'Get all port requirements for a product' },
    { name: 'search_ports', desc: 'Free-text keyword search across all products' },
    { name: 'search_by_port_number', desc: 'Find which products and services use a specific port' },
    { name: 'generate_topology', desc: 'Resolve firewall rules between named servers' },
    { name: 'generate_app_import', desc: 'Generate a JSON import file for Magic Ports' },
  ];

  readonly examplePrompts = [
    'What ports does VBR v13 need?',
    'Which products use port 902 and why?',
    'Generate firewall rules for my VBR environment — VBR server, Linux proxy, repo, and ESXi via vCenter',
    'Create a Magic Ports import file for my VB365 deployment',
  ];

  copyText(text: string, label: string): void {
    if (!navigator.clipboard) {
      this.messageService.add({ severity: 'error', summary: 'Copy failed', detail: 'Clipboard access is not available in this browser.' });
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => this.messageService.add({ severity: 'success', summary: `${label} copied` }),
      () => this.messageService.add({ severity: 'error', summary: 'Copy failed', detail: 'Clipboard access was blocked by the browser.' }),
    );
  }
}
