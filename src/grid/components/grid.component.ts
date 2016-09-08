/*
 * (C) Copyright 2016 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

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
  @Input() waiting:boolean = false;
  @Input() showGrid:boolean = false;

  private defaultFrom = new Date(new Date().valueOf() - (10 * 60 * 60 * 1000));
  private defaultTo = new Date(new Date().valueOf() - (1 * 60 * 60 * 1000));
  private guiquery:string;

  // Grid
  private AgGridNg2:gridNg2;
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

    let cellRenderer = function (params) {
      return '<span title="the tooltip" style=" text-overflow: clip; overflow: visible; white-space: normal">' + params.data.message + '</span>';
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
        headerName: 'Type', width: 50, checkboxSelection: false, suppressSorting: true, field: "type",
        suppressMenu: true, pinned: false, cellClass: rowColor
      },
      {
        headerName: 'Thread', width: 170, checkboxSelection: false, suppressSorting: true, field: "thread",
        suppressMenu: true, pinned: false, cellClass: rowColor
      },
      {
        headerName: 'Message', width: 600, checkboxSelection: false, suppressSorting: true, field: "message",
        suppressMenu: true, pinned: false, cellClass: rowColor, cellRenderer: function (params) {
        return '<span style="text-overflow: clip; overflow: visible; white-space: normal" title="Message">' + (params.data.message == undefined ? '' : params.data.message) + '</span>';
      }
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
    console.log('onRowClicked: ' + $event.node.data);
  }

  private onQuickFilterChanged($event) {
    this.gridOptions.api.setQuickFilter($event.target.value);
  }

  private onColumnEvent($event) {
    console.log('onColumnEvent: ' + $event);
    this.gridOptions.enableColResize = true;
    let width = 601;
    if ($event.type != "columnEverythingChanged") {
      width = this.gridOptions.columnApi.getColumn("message").getActualWidth();
    }

    this.gridOptions.getRowHeight = function (params) {
      // assuming 90 characters per line with 601px as width of column
      let wordsByLine = (width * 90 / 601);
      return 25 * (Math.floor(params.data.message.length / wordsByLine) + 1);
    }

    this.gridOptions.api.setRowData(this.rowData);
  }

}
/**
 * Created by rbenitez on 14/4/16.
 */
