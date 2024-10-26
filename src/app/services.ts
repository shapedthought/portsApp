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

export interface TargetServiceRequest {
    productName: string;
    fromPort: string;
}

export interface FullServiceRequest {
    productName: string;
    fromPort: number;
    toPort: number;
}

export interface FullServiceResponse {
    product: string;
    fromPort: string;
    toPort: string;
    protocol: string;
    port: string;
    description: string;
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
}

export interface Product {
    id?: number;
    productName: string;
}

export interface Server {
    id: number;
    name: string;
}