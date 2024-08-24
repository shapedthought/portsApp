import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpHeaders } from '@angular/common/http'; // Import the HttpClient module
import { catchError, map, Observable, throwError } from 'rxjs'; // Import the Observable type
import { FullServiceResponse, Product, Service, SourceService, TargetServiceRequest, TargetServices } from './services';

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  constructor(private  http: HttpClient) {
  } 

  private handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      console.error('An error occurred:', error.error);
    } else {
      console.error(`Backend returned code ${error.status}, body was: ${error.error}`);
    }

    return throwError(() => new Error('Something bad happened; please try again later.'));
  }

  getApps(): Observable<Product[]>{

    return this.http.get<string[]>('http://localhost:8000/', {}).pipe(
      map(products => products.map((product, index) => ({ id: index + 1, productName: product }))),
      catchError(this.handleError)
    );
  }

  getSource(productName: Product): Observable<Service[]> {

      const targetServices: TargetServices[] = [];

      return this.http.post<string[]>('http://localhost:8000/source', productName).pipe(
        map(services => services.map((service, index) => ({ id: index + 1, name: service, targetServices: targetServices }))),
        catchError(this.handleError)
      );
    }

  getTarget(productName: string, fromPort: string): Observable<FullServiceResponse[]> {
  
    const targetServices: TargetServiceRequest = { productName: productName, fromPort };
  
    return this.http.post<FullServiceResponse[]>('http://localhost:8000/allTarget', targetServices ).pipe(
      catchError(this.handleError)
    );
  }

}
