import { Routes } from '@angular/router';
import { MappingComponent } from './mapping/mapping.component';
import { HomeComponent } from './home/home.component';
import { ReportComponent } from './report/report.component';

export const routes: Routes = [
    { path: '', component: HomeComponent},
    { path: 'mapping/:id', component: MappingComponent },
    { path: 'report', component: ReportComponent }  
];
