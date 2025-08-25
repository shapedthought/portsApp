export interface TargetServices {
  id: number;
  sourceService: string;
  targetService: string;
  ports: string;
  protocol: string;
}

export interface Service {
  id?: number;
  name: string;
  product: string;
  subheading: string;
  targetServices: TargetServices[];
}

export interface MappedServices {
  sourceServer: string;
  targetServer: string;
  product: string;
  id: number;
  sourceService: string;
  targetService: string;
  ports: string;
  protocol: string;
}

// export interface PortMapping {
//     id: number;
//     targetServer: string;
//     service: string;
//     ports: string;
//     totalMappedPorts: number;
//     totalMappedServers: number;
//     protocol: string;
// }

export interface SourceServiceRequest {
  productName: string;
}

export interface SourceService {
  id: number;
  sourceService: string;
}

export interface SourceServiceDetailed {
  product: string;
  sourceService: string;
  subheading: string;
}

export interface TargetServiceRequest {
  productName: string;
  sourceService: string;
  subheading: string;
}

export interface FullServiceRequest {
  productName: string;
  sourceService: string;
  targetService: string;
}

export interface FullServiceResponse {
  id?: number;
  product: string;
  sourceService: string;
  targetService: string;
  protocol: string;
  port: string;
  description: string;
  subheading: string;
  subheadingL2: string;
  subheadingL3: string;
}

export interface MappedPorts {
  sourceServerId: number;
  sourceServerName: string;
  targetServerId: number;
  targetServerName: string;
  sourceService: string;
  targetService: string;
  description: string;
  product: string;
  port: string;
  protocol: string;
}

export interface ShowMappedPorts {
  index: number;
  serverName: string;
  service: string;
  protocol: string;
  port: string;
}

export interface PortMapping {
  id: number;
  sourceServer: string;
  totalMappedPorts: number;
  totalMappedInboundPorts: number;
  totalMappedServers: number;
  mappedPorts: MappedPorts[];
  allOutboundPortsTcp: string[];
  allOutboundPortsUdp: string[];
  allInboundPortsTcp: string[];
  allInboundPortsUdp: string[];
  mappedPortsByProtocol: ShowMappedPorts[];
  mappedPortsByProtocolInbound: ShowMappedPorts[];
}

export interface Product {
  id?: number;
  productName: string;
}

export interface Server {
  id: number;
  name: string;
}
