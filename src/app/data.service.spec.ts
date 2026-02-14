import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';
import { createTestPortMapping, createTestMappedPort } from './testing/test-utils';
import { PortMapping } from './services';

describe('DataService', () => {
  let service: DataService;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] ?? null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => { store[key] = value; });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => { delete store[key]; });

    TestBed.configureTestingModule({});
    service = TestBed.inject(DataService);
  });

  // --- Initialization & Defaults ---

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with 2 default servers', () => {
      const ports = service.mappedPorts();
      expect(ports.length).toBe(2);
      expect(ports[0].sourceServer).toBe('Server 1');
      expect(ports[1].sourceServer).toBe('Server 2');
    });

    it('should assign UUID ids to default servers', () => {
      const ports = service.mappedPorts();
      ports.forEach(pm => {
        expect(pm.id).toBeTruthy();
        expect(pm.id.length).toBeGreaterThan(10);
      });
    });

    it('servers computed signal should return unique server names', () => {
      const servers = service.servers();
      expect(servers.length).toBe(2);
      expect(servers.map(s => s.name)).toContain('Server 1');
      expect(servers.map(s => s.name)).toContain('Server 2');
    });

    it('hasMappedPorts should return false when no mappings exist', () => {
      expect(service.hasMappedPorts()).toBeFalse();
    });

    it('hasMappedPorts should return true when mappings exist', () => {
      const pm = service.mappedPorts()[0];
      pm.mappedPorts.push(createTestMappedPort());
      service.mappedPorts.set([pm, service.mappedPorts()[1]]);
      expect(service.hasMappedPorts()).toBeTrue();
    });
  });

  // --- localStorage persistence ---

  describe('localStorage persistence', () => {
    it('savePortMapping() should write to localStorage', () => {
      service.savePortMapping();
      expect(localStorage.setItem).toHaveBeenCalledWith('portMapping', jasmine.any(String));
      const saved = JSON.parse(store['portMapping']);
      expect(saved.length).toBe(2);
    });

    it('loadPortMapping() should restore data from localStorage', () => {
      const testData = [
        createTestPortMapping({ id: 'uuid-1', sourceServer: 'Loaded Server' }),
      ];
      store['portMapping'] = JSON.stringify(testData);

      service.loadPortMapping();
      const ports = service.mappedPorts();
      expect(ports.length).toBe(1);
      expect(ports[0].sourceServer).toBe('Loaded Server');
    });

    it('loadPortMapping() should auto-migrate integer IDs to UUIDs', () => {
      const testData = [
        { ...createTestPortMapping({ sourceServer: 'Old Server' }), id: 1 as any },
        { ...createTestPortMapping({ sourceServer: 'Another Old' }), id: '2' },
      ];
      store['portMapping'] = JSON.stringify(testData);

      service.loadPortMapping();
      const ports = service.mappedPorts();
      expect(ports.length).toBe(2);
      // IDs should now be UUIDs (not integers)
      ports.forEach(pm => {
        expect(/^\d+$/.test(pm.id)).toBeFalse();
        expect(pm.id.length).toBeGreaterThan(10);
      });
      // Should have saved the migrated data
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('loadPortMapping() should not migrate already-valid UUIDs', () => {
      const testData = [
        createTestPortMapping({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', sourceServer: 'UUID Server' }),
      ];
      store['portMapping'] = JSON.stringify(testData);

      service.loadPortMapping();
      const ports = service.mappedPorts();
      expect(ports[0].id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });

    it('deleteAll() should reset to defaults and clear localStorage', () => {
      service.addNewServer('Extra Server');
      expect(service.mappedPorts().length).toBe(3);

      service.deleteAll();
      expect(service.mappedPorts().length).toBe(2);
      expect(service.mappedPorts()[0].sourceServer).toBe('Server 1');
      expect(localStorage.removeItem).toHaveBeenCalledWith('portMapping');
    });
  });

  // --- Server CRUD ---

  describe('server CRUD', () => {
    it('addNewServer() should append a new server with UUID', () => {
      service.addNewServer('New Server');
      const ports = service.mappedPorts();
      expect(ports.length).toBe(3);
      expect(ports[2].sourceServer).toBe('New Server');
      expect(ports[2].id).toBeTruthy();
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('deleteServer() should remove server by UUID', () => {
      const idToDelete = service.mappedPorts()[0].id;
      service.deleteServer(idToDelete);
      const ports = service.mappedPorts();
      expect(ports.length).toBe(1);
      expect(ports.find(pm => pm.id === idToDelete)).toBeUndefined();
    });

    it('deleteServer() should not affect other servers', () => {
      const idToDelete = service.mappedPorts()[0].id;
      const remainingId = service.mappedPorts()[1].id;
      service.deleteServer(idToDelete);
      expect(service.mappedPorts().length).toBe(1);
      expect(service.mappedPorts()[0].id).toBe(remainingId);
    });

    it('updateName() should rename server and update all target references', () => {
      const ports = service.mappedPorts();
      const serverId = ports[0].id;
      const oldName = ports[0].sourceServer;

      // Add a mapping on server 2 that targets server 1
      const pm1 = ports[1];
      pm1.mappedPorts.push(createTestMappedPort({ targetServerName: oldName }));
      service.mappedPorts.set([ports[0], pm1]);

      service.updateName('Renamed Server', serverId);

      const updated = service.mappedPorts();
      expect(updated[0].sourceServer).toBe('Renamed Server');
      // Target reference on server 2 should also be updated
      expect(updated[1].mappedPorts[0].targetServerName).toBe('Renamed Server');
    });
  });

  // --- Port mapping operations ---

  describe('port mapping operations', () => {
    it('updatePortMapping() should replace matching entry by UUID', () => {
      const pm = service.mappedPorts()[0];
      const modified = { ...pm, sourceServer: 'Modified Server' };
      service.updatePortMapping(modified);
      expect(service.mappedPorts()[0].sourceServer).toBe('Modified Server');
    });

    it('uploadPortMapping() should set data and save', () => {
      const newData = [createTestPortMapping({ sourceServer: 'Uploaded' })];
      service.uploadPortMapping(newData);
      expect(service.mappedPorts().length).toBe(1);
      expect(service.mappedPorts()[0].sourceServer).toBe('Uploaded');
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  // --- Port calculations ---

  describe('recalculateMappedPorts()', () => {
    let baseMapping: PortMapping;

    beforeEach(() => {
      baseMapping = createTestPortMapping({ id: 'calc-test', sourceServer: 'CalcServer' });
    });

    it('should count unique ports correctly', () => {
      baseMapping.mappedPorts = [
        createTestMappedPort({ port: '443', protocol: 'TCP' }),
        createTestMappedPort({ port: '8080', protocol: 'TCP' }),
        createTestMappedPort({ port: '443', protocol: 'TCP' }), // duplicate
      ];
      service.mappedPorts.set([baseMapping]);
      service.recalculateMappedPorts();

      const result = service.mappedPorts()[0];
      expect(result.totalMappedPorts).toBe(2); // 443 + 8080 (deduped)
    });

    it('should separate TCP and UDP ports', () => {
      baseMapping.mappedPorts = [
        createTestMappedPort({ port: '443', protocol: 'TCP' }),
        createTestMappedPort({ port: '53', protocol: 'UDP' }),
        createTestMappedPort({ port: '80', protocol: 'TCP' }),
      ];
      service.mappedPorts.set([baseMapping]);
      service.recalculateMappedPorts();

      const result = service.mappedPorts()[0];
      expect(result.allOutboundPortsTcp).toContain('443');
      expect(result.allOutboundPortsTcp).toContain('80');
      expect(result.allOutboundPortsUdp).toContain('53');
      expect(result.allOutboundPortsTcp).not.toContain('53');
    });

    it('should handle comma-separated ports', () => {
      baseMapping.mappedPorts = [
        createTestMappedPort({ port: '80, 443, 8080', protocol: 'TCP' }),
      ];
      service.mappedPorts.set([baseMapping]);
      service.recalculateMappedPorts();

      const result = service.mappedPorts()[0];
      expect(result.totalMappedPorts).toBe(3);
      expect(result.allOutboundPortsTcp).toContain('80');
      expect(result.allOutboundPortsTcp).toContain('443');
      expect(result.allOutboundPortsTcp).toContain('8080');
    });

    it('should handle port ranges and add range to count', () => {
      baseMapping.mappedPorts = [
        createTestMappedPort({ port: '3000-3010', protocol: 'TCP' }),
      ];
      service.mappedPorts.set([baseMapping]);
      service.recalculateMappedPorts();

      const result = service.mappedPorts()[0];
      // 1 unique port entry + 10 from range = 11
      expect(result.totalMappedPorts).toBe(11);
      expect(result.allOutboundPortsTcp).toContain('3000-3010');
    });

    it('should calculate inbound ports from other servers mappings', () => {
      const server1 = createTestPortMapping({ id: 'srv1', sourceServer: 'Server A' });
      const server2 = createTestPortMapping({ id: 'srv2', sourceServer: 'Server B' });

      // Server A sends traffic to Server B on port 443
      server1.mappedPorts = [
        createTestMappedPort({
          sourceServerName: 'Server A',
          targetServerName: 'Server B',
          port: '443',
          protocol: 'TCP',
        }),
      ];

      service.mappedPorts.set([server1, server2]);
      service.recalculateMappedPorts();

      const serverB = service.mappedPorts().find(pm => pm.sourceServer === 'Server B')!;
      expect(serverB.totalMappedInboundPorts).toBe(1);
      expect(serverB.allInboundPortsTcp).toContain('443');
    });
  });

  // --- Protocol aggregation ---

  describe('recalculateServerMappedPorts()', () => {
    it('should group outbound ports by target server and protocol', () => {
      const pm = createTestPortMapping({ id: 'agg-test', sourceServer: 'Source' });
      pm.mappedPorts = [
        createTestMappedPort({ targetServerName: 'TargetA', port: '443', protocol: 'TCP' }),
        createTestMappedPort({ targetServerName: 'TargetA', port: '8080', protocol: 'TCP' }),
        createTestMappedPort({ targetServerName: 'TargetB', port: '53', protocol: 'UDP' }),
      ];
      service.mappedPorts.set([pm]);
      service.recalculateServerMappedPorts();

      const result = service.mappedPorts()[0];
      expect(result.mappedPortsByProtocol.length).toBe(2); // TargetA-TCP, TargetB-UDP

      const targetATcp = result.mappedPortsByProtocol.find(
        p => p.serverName === 'TargetA' && p.protocol === 'TCP'
      );
      expect(targetATcp).toBeTruthy();
      expect(targetATcp!.port).toContain('443');
      expect(targetATcp!.port).toContain('8080');
    });

    it('should group inbound ports by source server and protocol', () => {
      const server1 = createTestPortMapping({ id: 'srv1', sourceServer: 'Alpha' });
      const server2 = createTestPortMapping({ id: 'srv2', sourceServer: 'Beta' });

      server1.mappedPorts = [
        createTestMappedPort({
          sourceServerName: 'Alpha',
          targetServerName: 'Beta',
          port: '6180',
          protocol: 'TCP',
        }),
      ];

      service.mappedPorts.set([server1, server2]);
      service.recalculateServerMappedPorts();

      const beta = service.mappedPorts().find(pm => pm.sourceServer === 'Beta')!;
      expect(beta.mappedPortsByProtocolInbound.length).toBe(1);
      expect(beta.mappedPortsByProtocolInbound[0].serverName).toBe('Alpha');
      expect(beta.mappedPortsByProtocolInbound[0].port).toContain('6180');
    });
  });

  // --- Selected service ---

  describe('selected service', () => {
    it('should default to VB365', () => {
      expect(service.getSelectedService()).toBe('VB365');
    });

    it('should update and return selected service', () => {
      service.updatedSelectedService('VBR');
      expect(service.getSelectedService()).toBe('VBR');
    });
  });
});
