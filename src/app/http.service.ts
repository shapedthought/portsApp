import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // Import the HttpClient module
import { catchError, map, Observable, throwError } from 'rxjs'; // Import the Observable type
import {
  FullServiceResponse,
  PortMapping,
  Product,
  Service,
  TargetServiceRequest,
  TargetServices,
  SourceServiceDetailed,
} from './services';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  private readonly portsServer = environment.portsServer;

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      console.error('An error occurred:', error.error);
    } else {
      console.error(
        `Backend returned code ${error.status}, body was: ${error.error}`
      );
    }

    return throwError(
      () => new Error('Something bad happened; please try again later.')
    );
  }

  getApps(): Observable<Product[]> {
    return this.http.get<string[]>(this.portsServer, {}).pipe(
      map((products) =>
        products.map((product, index) => ({
          id: index + 1,
          productName: product,
        }))
      ),
      catchError(this.handleError)
    );
  }

  getSource(productName: Product): Observable<Service[]> {
    const targetServices: TargetServices[] = [];

    return this.http
      .post<SourceServiceDetailed[]>(
        `${this.portsServer}/sourceDetails`,
        productName
      )
      .pipe(
        map((services) =>
          services.map((service) => ({
            name: service.sourceService, // Assign sourceService to name
            product: productName.productName,
            subheading: service.subheading,
            targetServices: targetServices,
          }))
        ),
        catchError(this.handleError)
      );
  }

  getTarget(
    productName: string,
    sourceService: string,
    subheading: string
  ): Observable<FullServiceResponse[]> {
    const targetServices: TargetServiceRequest = {
      productName: productName,
      sourceService: sourceService,
      subheading: subheading,
    };

    return this.http
      .post<FullServiceResponse[]>(
        `${this.portsServer}/allTarget`,
        targetServices
      )
      .pipe(
        map((response) => {
          response.map((item, id) => {
            item.id = id + 1;
            return item;
          });
          return response;
        }),
        catchError(this.handleError)
      );
  }

  generateExcelData(
    portsMapping: PortMapping[]
  ): Observable<{ file_url: string }> {
    const mappedPorts = portsMapping.flatMap(
      (portMapping) => portMapping.mappedPorts
    );
    return this.http
      .post<{ file_url: string }>(
        `${this.portsServer}/generateExcelWithUrl`,
        mappedPorts
      )
      .pipe(catchError(this.handleError));
  }
}
