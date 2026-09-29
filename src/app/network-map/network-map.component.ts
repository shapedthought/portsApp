import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { ThemeService } from '../theme.service';
import { ProtocolFilter, Selection, edgeLabelText } from '../topology';
import { WorkspaceService } from '../workspace.service';
import { edgeDirection, layoutMap } from './map-layout';

const MIN_CANVAS_HEIGHT = 560;
const MAX_STROKE = 8;

/** Map mode: servers as nodes, one edge per source→target pair. */
@Component({
  selector: 'app-network-map',
  templateUrl: './network-map.component.html',
  styleUrl: './network-map.component.css',
})
export class NetworkMapComponent implements AfterViewInit, OnDestroy {
  readonly ws = inject(WorkspaceService);
  readonly theme = inject(ThemeService);

  readonly protocolOptions: ProtocolFilter[] = ['ALL', 'TCP', 'UDP'];

  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
  private readonly canvasSize = signal({ width: 0, height: MIN_CANVAS_HEIGHT });
  private observer?: ResizeObserver;

  private readonly layout = computed(() => {
    const showPorts = this.ws.showPortNumbers();
    const edges = this.ws.edges().map(e => ({ ...e, labelText: `${e.protocolLabel} ${edgeLabelText(e.ports, showPorts)}` }));
    return layoutMap(this.ws.servers().map(s => s.name), edges);
  });

  /** The graph is centred in the canvas, and the canvas scrolls when the graph is bigger. */
  readonly stage = computed(() => {
    const { width, height } = this.layout();
    const size = this.canvasSize();
    const stageWidth = Math.max(width, size.width);
    const stageHeight = Math.max(height, size.height, MIN_CANVAS_HEIGHT);
    return {
      width: stageWidth,
      height: stageHeight,
      offsetX: (stageWidth - width) / 2,
      offsetY: (stageHeight - height) / 2,
    };
  });

  /** Servers linked to the current selection; everything else fades. null means nothing is selected. */
  private readonly linked = computed<Set<string> | null>(() => {
    const sel = this.ws.selection();
    if (sel.type === 'none') return null;
    const edges = this.ws.edges();
    if (sel.type === 'edge') {
      const e = edges.find(x => x.id === sel.id);
      return new Set(e ? [e.source, e.target] : []);
    }
    const set = new Set([sel.id]);
    edges.forEach(e => {
      if (e.source === sel.id) set.add(e.target);
      if (e.target === sel.id) set.add(e.source);
    });
    return set;
  });

  readonly nodes = computed(() => {
    const { offsetX, offsetY } = this.stage();
    const positions = this.layout().nodes;
    const sel = this.ws.selection();
    const linked = this.linked();
    return this.ws.servers().map(s => {
      const p = positions.get(s.name)!;
      return {
        ...s,
        x: p.x + offsetX,
        y: p.y + offsetY,
        selected: sel.type === 'node' && sel.id === s.name,
        faded: linked !== null && !linked.has(s.name),
      };
    });
  });

  readonly edges = computed(() => {
    const { offsetX, offsetY } = this.stage();
    const geometry = this.layout().edges;
    const sel = this.ws.selection();
    const filter = this.ws.protocolFilter();
    const showPorts = this.ws.showPortNumbers();
    return this.ws.edges().map(e => {
      const geo = geometry.get(e.id)!;
      const touches = sel.type === 'node' ? e.source === sel.id || e.target === sel.id : sel.type === 'edge' ? e.id === sel.id : true;
      const visible = filter === 'ALL' || e.protocols.includes(filter);
      const active = sel.type === 'edge' && sel.id === e.id;
      return {
        id: e.id,
        d: geo.d,
        labelX: geo.mid.x + offsetX,
        labelY: geo.mid.y + offsetY,
        dir: edgeDirection(e.source, geo.reverse),
        protocol: e.protocolLabel,
        text: edgeLabelText(e.ports, showPorts),
        dashed: e.protocols.length === 1 && e.protocols[0] === 'UDP',
        strokeWidth: Math.min(1 + e.ports.length * 0.35, MAX_STROKE) + (active ? 1 : 0),
        opacity: !visible ? 0.12 : touches ? 1 : 0.35,
        hot: touches && sel.type !== 'none',
        active,
        title: `${e.source} → ${e.target}: ${e.protocolLabel} ${e.ports.join(', ')}`,
      };
    });
  });

  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      this.canvasSize.set({ width, height });
    });
    this.observer.observe(this.canvas().nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  select(selection: Selection, event?: Event): void {
    event?.stopPropagation();
    this.ws.select(selection);
  }
}
