import {Component, Input} from 'angular2/core';
import {Http, Response, HTTP_PROVIDERS, Headers, RequestOptions, RequestMethod, Request} from 'angular2/http'
import {CORE_DIRECTIVES, FORM_DIRECTIVES} from 'angular2/common';
import {dateToInputLiteral} from './../../shared/utils/Utils';
import {AgGridNg2} from 'ag-grid-ng2/main';
import {GridOptions} from 'ag-grid/main';
import 'ag-grid-enterprise/main';
import {ElasticSearchService} from './../../shared/services/elasticSearch.service';


import {NameListService} from '../../shared/services/name-list.service';

const ES_URL = 'http://jenkins:jenkins130@elasticsearch.kurento.org:9200/';
const INDEX = "<kurento-*>";
const RESULTS_PER_REQUEST = 50;

@Component({
  selector: 'sd-grid',
  templateUrl: './grid/components/grid.component.html',
  styleUrls: ['./grid/components/grid.component.css'],
  providers: [HTTP_PROVIDERS, ElasticSearchService],
  directives: [FORM_DIRECTIVES, CORE_DIRECTIVES, AgGridNg2]
})

export class GridComponent {
  constructor(private _elasticSearchService:ElasticSearchService, private http:Http) {
    // we pass an empty gridOptions in, so we can grab the api out
    this.gridOptions = <GridOptions>{};
    this.createColumnDefs();
  }

  @Input() rowData:any[] = [];
  @Input() waiting: boolean = false;
  @Input() showGrid: boolean = false;

  private defaultFrom = new Date(new Date().valueOf() - (10 * 60 * 60 * 1000));
  private defaultTo = new Date(new Date().valueOf() - (1 * 60 * 60 * 1000));
  private guiquery:string;

  // Grid
  private gridOptions:GridOptions;
 // private showGrid:boolean;
  //private rowData:any[] = [];
  private columnDefs:any[];
  private rowCount:string;
 // private waiting:boolean = false;

  loggers:string;
  hosts:string;
  message:string;
  thread:string;


  private createColumnDefs() {

    let rowColor = function (params) {
      if (params.data.level === 'ERROR') {
        return 'log-level-error';
      } else if (params.data.level === 'WARN') {
        return 'log-level-warn';
      } else {
        return '';
      }
    }

    this.columnDefs = [
      {
        headerName: '#', width: 30, checkboxSelection: false, suppressSorting: true,
        suppressMenu: true, pinned: true, cellClass: rowColor
      },
      {
        headerName: 'Time', width: 200, checkboxSelection: false, suppressSorting: true, field: "time",
        suppressMenu: true, pinned: false, cellClass: rowColor
      },
      {
        headerName: 'Level', width: 60, checkboxSelection: false, suppressSorting: true, field: "level",
        suppressMenu: true, pinned: false, cellClass: rowColor
      },
      {
        headerName: 'Type', width: 60, checkboxSelection: false, suppressSorting: true, field: "type",
        suppressMenu: true, pinned: false, cellClass: rowColor
      },
      {
        headerName: 'Thread', width: 170, checkboxSelection: false, suppressSorting: true, field: "thread",
        suppressMenu: true, pinned: false, cellClass: rowColor
      },
      {
        headerName: 'Message', width: 600, checkboxSelection: false, suppressSorting: true, field: "message",
        suppressMenu: true, pinned: false, cellClass: rowColor
      },
      {
        headerName: 'Logger', width: 300, checkboxSelection: false, suppressSorting: true, field: "logger",
        suppressMenu: true, pinned: false, cellClass: rowColor
      },
      {
        headerName: 'Host', width: 300, checkboxSelection: false, suppressSorting: true, field: "host",
        suppressMenu: true, pinned: false, cellClass: rowColor
      }
    ];
  }

  private calculateRowCount() {
    console.log("Calculate Row Count", this.gridOptions.api, " rowData:", this.rowData);
    if (this.gridOptions.api && this.rowData) {
      var model = this.gridOptions.api.getModel();
      var totalRows = this.rowData.length;
      var processedRows = model.getRowCount();
      this.rowCount = processedRows.toLocaleString() + ' / ' + totalRows.toLocaleString();
    }
  }

  private onModelUpdated() {
    console.log('onModelUpdated');
    this.calculateRowCount();
    this.gridOptions.api.ensureIndexVisible(this.gridOptions.rowData.length - 1);
  }


  private onCellClicked($event) {
    console.log('onCellClicked: ' + $event.rowIndex + ' ' + $event.colDef.field);
    let logEntry = this.rowData[$event.rowIndex];
    //this.selectedLogEntry = JSON.stringify(logEntry, null, 2);
    //this.selectedLogMessage = logEntry.message;
  }

  private onCellValueChanged($event) {
    console.log('onCellValueChanged: ' + $event.oldValue + ' to ' + $event.newValue);
  }

  private onCellDoubleClicked($event) {
    console.log('onCellDoubleClicked: ' + $event.rowIndex + ' ' + $event.colDef.field);
  }

  private onCellContextMenu($event) {
    console.log('onCellContextMenu: ' + $event.rowIndex + ' ' + $event.colDef.field);
  }

  private onCellFocused($event) {
    console.log('onCellFocused: (' + $event.rowIndex + ',' + $event.colIndex + ')');
  }

  private onRowSelected($event) {
    console.log('onRowSelected: ' + $event.node.data.name);
  }

  private onSelectionChanged() {
    console.log('selectionChanged');
  }

  private onBeforeFilterChanged() {
    console.log('beforeFilterChanged');
  }

  private onAfterFilterChanged() {
    console.log('afterFilterChanged');
  }

  private onFilterModified() {
    console.log('onFilterModified');
  }

  private onBeforeSortChanged() {
    console.log('onBeforeSortChanged');
  }

  private onAfterSortChanged() {
    console.log('onAfterSortChanged');
  }

  private onVirtualRowRemoved($event) {
    // because this event gets fired LOTS of times, we don't print it to the
    // console. if you want to see it, just uncomment out this line
    // console.log('onVirtualRowRemoved: ' + $event.rowIndex);
  }

  private onRowClicked($event) {
    console.log('onRowClicked: ' + $event.node.data.name);
  }

  private onQuickFilterChanged($event) {
    this.gridOptions.api.setQuickFilter($event.target.value);
  }

  // here we use one generic event to handle all the column type events.
  // the method just prints the event name
  private onColumnEvent($event) {
    console.log('onColumnEvent: ' + $event);
  }

}
/**
 * Created by rbenitez on 14/4/16.
 */
