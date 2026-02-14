import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpService } from './http.service';
import { environment } from '../environments/environment';
import { createTestPortMapping, createTestMappedPort } from './testing/test-utils';

describe('HttpService', () => {
  let service: HttpService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.portsServer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(HttpService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- API calls ---

  describe('getApps()', () => {
    it('should GET products and map to Product[]', () => {
      const mockResponse = ['VB365', 'VBR', 'VBAWS'];

      service.getApps().subscribe(products => {
        expect(products.length).toBe(3);
        expect(products[0]).toEqual({ id: 1, productName: 'VB365' });
        expect(products[1]).toEqual({ id: 2, productName: 'VBR' });
        expect(products[2]).toEqual({ id: 3, productName: 'VBAWS' });
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getSource()', () => {
    it('should POST and return Service[]', () => {
      const mockResponse = [
        { product: 'VB365', sourceService: 'Backup Server', subheading: 'Backup Infrastructure' },
        { product: 'VB365', sourceService: 'Proxy Agent', subheading: 'Proxy Infrastructure' },
      ];
      const productParam = { productName: 'VB365' };

      service.getSource(productParam).subscribe(services => {
        expect(services.length).toBe(2);
        expect(services[0].name).toBe('Backup Server');
        expect(services[0].product).toBe('VB365');
        expect(services[0].subheading).toBe('Backup Infrastructure');
        expect(services[1].name).toBe('Proxy Agent');
      });

      const req = httpMock.expectOne(`${baseUrl}/sourceDetails`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(productParam);
      req.flush(mockResponse);
    });
  });

  describe('getTarget()', () => {
    it('should POST and return FullServiceResponse[]', () => {
      const mockResponse = [
        {
          product: 'VB365',
          sourceService: 'Backup Server',
          targetService: 'Cloud Service',
          protocol: 'TCP',
          port: '443',
          description: 'HTTPS connection',
          subheading: 'Backup Infra',
          subheadingL2: '',
          subheadingL3: '',
        },
      ];

      service.getTarget('VB365', 'Backup Server', 'Backup Infra').subscribe(targets => {
        expect(targets.length).toBe(1);
        expect(targets[0].id).toBe(1);
        expect(targets[0].targetService).toBe('Cloud Service');
        expect(targets[0].port).toBe('443');
      });

      const req = httpMock.expectOne(`${baseUrl}/allTarget`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        productName: 'VB365',
        sourceService: 'Backup Server',
        subheading: 'Backup Infra',
      });
      req.flush(mockResponse);
    });
  });

  describe('generateExcelData()', () => {
    it('should POST flattened mapped ports', () => {
      const pm = createTestPortMapping({ sourceServer: 'Server 1' });
      pm.mappedPorts = [
        createTestMappedPort({ port: '443', protocol: 'TCP' }),
        createTestMappedPort({ port: '53', protocol: 'UDP' }),
      ];
      const mockResponse = { file_url: 'https://example.com/file.xlsx' };

      service.generateExcelData([pm]).subscribe(result => {
        expect(result.file_url).toBe('https://example.com/file.xlsx');
      });

      const req = httpMock.expectOne(`${baseUrl}/generateExcelWithUrl`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.length).toBe(2);
      expect(req.request.body[0].port).toBe('443');
      req.flush(mockResponse);
    });
  });

  // --- Error handling ---

  describe('error handling', () => {
    it('should handle network error (status 0)', () => {
      spyOn(console, 'error');

      service.getApps().subscribe({
        error: (err) => {
          expect(err.message).toContain('Something bad happened');
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    });

    it('should handle HTTP 500 server error', () => {
      spyOn(console, 'error');

      service.getApps().subscribe({
        error: (err) => {
          expect(err.message).toContain('Something bad happened');
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });
    });

    it('should handle HTTP 404 not found', () => {
      spyOn(console, 'error');

      service.getSource({ productName: 'NonExistent' }).subscribe({
        error: (err) => {
          expect(err.message).toContain('Something bad happened');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/sourceDetails`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });
});
