export interface TargetServices {
   id: number;
   sourceService: string;
   targetService: string;
   ports: string;
   protocol: string;
}

export interface Service {
    id: number;
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

export interface TargetServiceRequest {
    productName: string;
    fromPort: number;
}

export interface FullServiceRequest {
    productName: string;
    fromPort: number;
    toPort: number;
}

export interface FullSeriveResponse {
    productName: string;
    fromPort: number;
    toPort: number;
    targetServer: string;
    targetService: string;
    protocol: string;
}

export interface MappedPorts {
    targetServerId: string;
    targetServerName: string;
    sourceService: string;
    targetService: string;
    description: string;
    product: string;
    fromPort: string;
    toPort: string;
    protocol: string;
}

export interface PortMapping {
    id: number;
    sourceServer: string;
    totalMappedPorts: number;
    totalMappedServers: number;
    mappedPorts: MappedPorts[];
}

export interface Server {
    id: number;
    name: string;
    targetServices: TargetServices[];
}

export interface Product {
    id?: number;
    productName: string;
}