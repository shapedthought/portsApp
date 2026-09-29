import { NODE_WIDTH, layoutMap } from './map-layout';

describe('layoutMap', () => {
  const edges = [
    { id: 'VBR|Proxy', source: 'VBR', target: 'Proxy' },
    { id: 'VBR|DNS', source: 'VBR', target: 'DNS' },
    { id: 'Proxy|VBR', source: 'Proxy', target: 'VBR' },
  ];

  it('places sources to the left of their targets', () => {
    const layout = layoutMap(['VBR', 'Proxy', 'DNS'], edges);
    const vbr = layout.nodes.get('VBR')!;
    expect(layout.nodes.get('Proxy')!.x).toBeGreaterThan(vbr.x + NODE_WIDTH);
    expect(layout.nodes.get('DNS')!.x).toBeGreaterThan(vbr.x + NODE_WIDTH);
  });

  it('marks right-to-left edges as reversed and keeps labels inside the bounds', () => {
    const layout = layoutMap(['VBR', 'Proxy', 'DNS'], edges);
    expect(layout.edges.get('VBR|Proxy')!.reverse).toBe(false);
    expect(layout.edges.get('Proxy|VBR')!.reverse).toBe(true);
    for (const geo of layout.edges.values()) {
      expect(geo.d.startsWith('M')).toBe(true);
      expect(geo.mid.x).toBeLessThan(layout.width);
      expect(geo.mid.y).toBeLessThan(layout.height);
    }
  });

  it('handles servers with no connections', () => {
    const layout = layoutMap(['Lonely'], []);
    expect(layout.nodes.size).toBe(1);
    expect(layout.edges.size).toBe(0);
  });
});
