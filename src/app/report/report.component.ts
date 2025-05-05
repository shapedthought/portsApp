import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../data.service';
import { PortMapping } from '../services';

@Component({
    selector: 'app-report',
    imports: [RouterLink],
    providers: [],
    templateUrl: './report.component.html',
    styleUrl: './report.component.css'
})
export class ReportComponent implements OnInit {

  portMapping: PortMapping[] = [];

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit(): void {
    this.dataService.loadPortMapping();
    this.portMapping = this.dataService.getMappedPorts();
  }

}
