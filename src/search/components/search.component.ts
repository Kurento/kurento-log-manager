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

import {Component} from 'angular2/core';
import {Http, Response, HTTP_PROVIDERS, Headers, RequestOptions, RequestMethod, Request} from 'angular2/http'
import {CORE_DIRECTIVES, FORM_DIRECTIVES} from 'angular2/common';
import {toInputLiteral} from './../../shared/utils/DateUtils';
import {AgGridNg2} from 'ag-grid-ng2/main';
import {GridOptions} from 'ag-grid/main';
import 'ag-grid-enterprise/main';

import {NameListService} from '../../shared/services/name-list.service';

const ES_URL = 'http://jenkins:jenkins130@elasticsearch.kurento.org:9200/';
const INDEX = "<kurento-*>";
const RESULTS_PER_REQUEST = 50;

@Component({
  selector: 'sd-search',
  templateUrl: './search/components/search.component.html',
  styleUrls: ['./search/components/search.component.css'],
  providers: HTTP_PROVIDERS,
  directives: [FORM_DIRECTIVES, CORE_DIRECTIVES, AgGridNg2]
})

export class SearchComponent {
  constructor(private http:Http) {
    // we pass an empty gridOptions in, so we can grab the api out
    this.gridOptions = <GridOptions>{};
    this.createColumnDefs();
    this.showGrid = false;
  }

  private defaultFrom = new Date(new Date().valueOf() - (10 * 60 * 60 * 1000));
  private defaultTo = new Date(new Date().valueOf() - (1 * 60 * 60 * 1000));
  private guiquery:string;

  // Grid
  private gridOptions:GridOptions;
  private showGrid:boolean;
  private rowData:any[] = [];
  private columnDefs:any[];
  private rowCount:string;
  private waiting:boolean = false;

  testType:boolean = false;
  clusterType:boolean = true;
  kmsType:boolean = true;

  debugLevel:boolean = true;
  infoLevel:boolean = true;
  warnLevel:boolean = true;
  errorLevel:boolean = true;

  loggers:string;
  hosts:string;
  message:string;
  thread:string;


  private processCommaSeparatedValue(value:string) {
    if (value === undefined) {
      return [];
    }
    let array:string[] = value.split(',').map(s => s.trim());
    if (array.length == 1 && array[0] === '') {
      array = [];
    }
    return array;
  }

  private addTermFilter(queryes:any, field:string, values:string[]) {

    let filter:any = {}
    if (values.length > 1) {
      filter[field] = values;
      queryes.filtered.filter.bool.must.push({
        "terms": filter
      })
    } else if (values.length == 1) {
      filter[field] = values[0];
      queryes.filtered.filter.bool.must.push({
        "match": filter
      })
    }
  }

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
        headerName: 'L', width: 60, checkboxSelection: false, suppressSorting: true, field: "level",
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


  getDefaultFromValue() {
    return toInputLiteral(this.defaultFrom);
  }

  getDefaultToValue() {
    return toInputLiteral(this.defaultTo);
  }

  search(from:string, to:string, valueToSearch:string, append:boolean = false) {
    console.log("Searching:", from, to, valueToSearch);

    this.showGrid = false;
    this.waiting = true;
    this.rowData = [];
    // All variables (boolean) have a default value as true
    // The search will be on loggers + hosts + message + thread

    let query = "";

    let types = [];

    if (this.clusterType) {
      types.push('cluster');
      types.push('boot');
    }

    if (this.kmsType) {
      types.push('kms');
    }

    let logLevels = [];

    if (this.debugLevel) {
      logLevels.push('debug');
    }

    if (this.infoLevel) {
      logLevels.push('info');
    }

    if (this.warnLevel) {
      logLevels.push('warn');
    }

    if (this.errorLevel) {
      logLevels.push('error');
    }

    let url = ES_URL + INDEX + '/_search?scroll=1m&filter_path=_scroll_id,hits.hits._source,hits.hits._type';

    console.log(this.guiquery);

    let queryfrom:any;
    let queryto:any;
    let sort:'asc' | 'desc';

    queryfrom = from;
    queryto = to;
    sort = 'asc';

    let queryes:any = {
      "filtered": {
        "filter": {
          "bool": {
            "must": [
              {
                "range": {
                  "@timestamp": {
                    "gte": queryfrom,
                    "lte": queryto
                  }
                }
              }
            ]
          }
        }
      }
    }

    this.addTermFilter(queryes, 'loglevel', logLevels);
    this.addTermFilter(queryes, 'type', types);

    /* let loggers = this.processCommaSeparatedValue(valueToSearch);
     this.addTermFilter(queryes, 'loggername', loggers);

     let hosts = this.processCommaSeparatedValue(valueToSearch);
     this.addTermFilter(queryes, 'host', hosts);*/

    let message = this.processCommaSeparatedValue(valueToSearch);
    this.addTermFilter(queryes, 'message', message);

    /*    let thread = this.processCommaSeparatedValue(valueToSearch);
     this.addTermFilter(queryes, 'threadid', thread);*/

    console.log("Query: ", queryes);
    console.log('-----------------------------------------------------------------');

    let esquery = {
      sort: [
        {'@timestamp': sort}
      ],
      //query: JSON.parse(this.guiquery),
      query: queryes,
      size: RESULTS_PER_REQUEST,
      _source: ['host', 'threadid', 'loggername', 'message', 'loglevel', 'logmessage', '@timestamp']
    };

    let maxResults = 500;

    this.internalSearch(url, esquery, maxResults, append);
  }

  private internalSearch(url:string, query:any, maxResults:number, append:boolean = false) {


    let requestoptions = new RequestOptions({
      method: RequestMethod.Post,
      url,
      body: JSON.stringify(query)
    })

    let body2 = JSON.stringify(query)

    console.log("Body2:", body2)

    this.http.request(new Request(requestoptions))
      .subscribe((res:Response) => {

        this.showGrid = true;
        this.waiting = false;
        let data = res.json()
        console.log("Res:", res);
        console.log("Data:", data);

        if (data.hits !== undefined && data.hits.hits.length === 0) {
          if (this.log === "") {
            this.log = "No results found";
          }
          console.log("Returned response without results. Aborting");
          return;
        }

        if (data.hits) {

          let prevSize = this.rowData.length;

          for (let logEntry of data.hits.hits) {

            let fullmessage:string = logEntry._source.message.replace('\n', '');

            let type = logEntry._type;
            let time = logEntry._source['@timestamp'];
            let message = type == 'cluster' || type == 'kms' ? logEntry._source.logmessage : logEntry._source.message;
            let level = logEntry._source.loglevel;
            let thread = logEntry._source.threadid;
            let logger = logEntry._source.loggername;
            let host = logEntry._source.host;

            //this.log += type + '|' + fullmessage + '\n';

            let logValue = {type, time, message, level, thread, logger, host};

            /*if (this.tail) {
             if (prevSize == 0) {

             this.rowData.splice(0, 0, logValue);
             } else {
             console.log("Prev log: " + JSON.stringify(this.rowData[prevSize - 1]));
             console.log("Curr log: " + JSON.stringify(logValue));
             if (this.rowData[prevSize - 1].time === logValue.time) {
             console.log("XXXXXXXXX");
             this.rowData = this.rowData.slice();
             return;
             }
             this.rowData.splice(prevSize, 0, logValue);
             }

             } else {*/
            this.rowData.push(logValue);
            /*}*/

            /*s.results++;

             if (this.results > maxResults) {
             //TODO: Remove scrollId to improve performance.
             this.log += "\nReached MAX_RESULTS=" + maxResults;
             console.log("Reached MAX_RESULTS=" + maxResults + ". Aborting log download");
             this.rowData = this.rowData.slice();



             return;
             }*/
          }
          console.log("Row Data:", this.rowData);

          this.rowData = this.rowData.slice();

        }


      }, (err:Response) => {
        console.error("Error:", err)
      });
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
