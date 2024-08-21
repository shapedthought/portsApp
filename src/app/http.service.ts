import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpHeaders } from '@angular/common/http'; // Import the HttpClient module
import { catchError, Observable, throwError } from 'rxjs'; // Import the Observable type
import { Product } from './services';

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

  getApps(): Observable<string[]>{

    return this.http.get<string[]>('http://localhost:8000/', {}).pipe(
      catchError(this.handleError)
    );
  }

  getSource(productName: Product): Observable<string[]> {

      
      return this.http.post<string[]>('http://localhost:8000/source', productName).pipe(
        catchError(this.handleError)
      );
    }

}
