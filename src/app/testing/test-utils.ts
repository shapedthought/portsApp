import { MappedPorts, PortMapping, createDefaultPortMapping } from '../services';
import { v4 as uuidv4 } from 'uuid';

export function createTestPortMapping(overrides?: Partial<PortMapping>): PortMapping {
  return {
    ...createDefaultPortMapping(uuidv4(), 'Test Server'),
    ...overrides,
  };
}

export function createTestMappedPort(overrides?: Partial<MappedPorts>): MappedPorts {
  return {
    sourceServerId: 'src-id',
    sourceServerName: 'Server 1',
    targetServerId: 'tgt-id',
    targetServerName: 'Server 2',
    sourceService: 'Backup Server',
    targetService: 'Cloud Service',
    description: 'Test description',
    product: 'VB365',
    port: '443',
    protocol: 'TCP',
    ...overrides,
  };
}
