import { createTestMappedPort, createTestPortMapping } from './testing/test-utils';
import { buildEdges, buildServers, buildStats, edgeLabelText, mergeRows, peerGroups, splitPorts } from './topology';

function sample() {
  return [
    createTestPortMapping({
      id: 'a',
      sourceServer: 'VBR',
      mappedPorts: [
        createTestMappedPort({ targetServerName: 'Proxy', targetService: 'Proxy service', port: '445, 135', protocol: 'TCP' }),
        createTestMappedPort({ targetServerName: 'Proxy', targetService: 'Proxy service', port: '135, 2500-3300', protocol: 'TCP' }),
        createTestMappedPort({ targetServerName: 'DNS', targetService: 'DNS server', port: '53', protocol: 'UDP' }),
      ],
    }),
    createTestPortMapping({
      id: 'b',
      sourceServer: 'Proxy',
      mappedPorts: [createTestMappedPort({ targetServerName: 'VBR', targetService: 'Backup server', port: '9392', protocol: 'TCP' })],
    }),
  ];
}

describe('topology', () => {
  it('splits port fields into chips, keeping ranges as one entry', () => {
    expect(splitPorts('445, 135 ,2500-3300')).toEqual(['445', '135', '2500–3300']);
    expect(splitPorts('')).toEqual([]);
  });

  it('merges rows for the same service and protocol, de-duplicating ports', () => {
    const rows = mergeRows(sample()[0].mappedPorts);
    expect(rows).toEqual([
      { service: 'Proxy service', protocol: 'TCP', ports: ['445', '135', '2500–3300'] },
      { service: 'DNS server', protocol: 'UDP', ports: ['53'] },
    ]);
  });

  it('counts out/in ports and targets per server, including unconfigured targets', () => {
    const servers = buildServers(sample());
    expect(servers).toEqual([
      { id: 'a', name: 'VBR', out: 5, in: 1, targets: 2, products: ['VB365'] },
      { id: 'b', name: 'Proxy', out: 1, in: 4, targets: 1, products: ['VB365'] },
      { id: null, name: 'DNS', out: 0, in: 1, targets: 0, products: [] },
    ]);
  });

  it('builds one edge per source→target pair with unique ports and protocols', () => {
    const edges = buildEdges(sample());
    expect(edges.map(e => e.id)).toEqual(['VBR|Proxy', 'VBR|DNS', 'Proxy|VBR']);
    expect(edges[0].ports).toEqual(['445', '135', '2500–3300']);
    expect(edges[0].protocolLabel).toBe('TCP');
    expect(edges[1].protocols).toEqual(['UDP']);
  });

  it('uses the owning server name, not a stale sourceServerName', () => {
    const data = sample();
    data[0].mappedPorts[0].sourceServerName = 'Old name';
    expect(buildEdges(data)[0].source).toBe('VBR');
  });

  it('groups a server’s mappings by peer in each direction', () => {
    const out = peerGroups(sample(), 'VBR', 'out');
    expect(out.map(g => [g.peer, g.portCount])).toEqual([['Proxy', 3], ['DNS', 1]]);
    const inbound = peerGroups(sample(), 'VBR', 'in');
    expect(inbound.map(g => [g.peer, g.portCount])).toEqual([['Proxy', 1]]);
  });

  it('summarises servers, connections and protocol counts', () => {
    const data = sample();
    expect(buildStats(data, buildEdges(data))).toEqual({ servers: 2, connections: 3, portMappings: 6, tcp: 5, udp: 1 });
  });

  it('formats edge labels with a +n overflow or a port count', () => {
    expect(edgeLabelText(['1', '2', '3', '4', '5'], true)).toBe('1 2 3 +2');
    expect(edgeLabelText(['1', '2'], true)).toBe('1 2');
    expect(edgeLabelText(['1'], false)).toBe('1 port');
    expect(edgeLabelText(['1', '2'], false)).toBe('2 ports');
  });
});
