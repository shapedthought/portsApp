import { Routes } from '@angular/router';
import { MappingComponent } from './mapping/mapping.component';
import { HomeComponent } from './home/home.component';
import { ReportComponent } from './report/report.component';
import { McpHowtoComponent } from './mcp-howto/mcp-howto.component';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';

export const routes: Routes = [
    { path: '', component: HomeComponent, data: { mode: 'dash' } },
    { path: 'map', component: HomeComponent, data: { mode: 'map' } },
    { path: 'mapping/:id', component: MappingComponent, canDeactivate: [unsavedChangesGuard] },
    { path: 'report', component: ReportComponent },
    { path: 'mcp', component: McpHowtoComponent }
];
