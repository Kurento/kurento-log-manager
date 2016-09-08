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
    this.gridOptions = {
      enableCellExpressions: true,
      context: {
        pattern1: 'NODATA',
        pattern2: 'NODATA',
        pattern3: 'NODATA',
        pattern4: 'NODATA',
        pattern5: 'NODATA',
        pattern1Color: '',
        pattern2Color: '',
        pattern3Color: '',
        pattern4Color: '',
        pattern5Color: '',
        pattern1List: [],
        pattern2List: [],
        pattern3List: [],
        pattern4List: [],
        pattern5List: []
      }
    };

    this.createColumnDefs();
  }

  @Input() rowData:any[] = [];
  @Input() waiting:boolean = false;
  @Input() showGrid:boolean = false;

  // Grid
  private gridOptions:GridOptions;
  private columnDefs:any[];
  private rowCount:string;

  loggers:string;
  hosts:string;
  message:string;
  thread:string;

  pattern1:string;
  pattern2:string;
  pattern3:string;
  pattern4:string;
  pattern5:string;

  pattern1Pos:number = -1;
  pattern2Pos:number = -1;
  pattern3Pos:number = -1;
  pattern4Pos:number = -1;
  pattern5Pos:number = -1;

  pattern1Show:boolean = false;
  pattern2Show:boolean = false;
  pattern3Show:boolean = false;
  pattern4Show:boolean = false;
  pattern5Show:boolean = false;

  numPattern:number = 0;

  scrollLock:boolean = false;

  private posActual:number = -1;

  private getNextPosition(element:number, array:Array<number>) {
    let i:number;
    for (i = 0; i < array.length; i++) {
      if (element < array[i]) {
        return i;
      }
    }
    return -1;
  }

  private getPrevPosition(element:number, array:Array<number>) {
    let i:number;
    for (i = array.length; i >= 0; i--) {
      if (element > array[i]) {
        return i;
      }
    }
    return -1;
  }

  private sorted(a:number, b:number) {
    return a - b
  }

  addPattern() {
    if (!this.pattern1Show) {
      this.pattern1Show = true;
    } else if (!this.pattern2Show) {
      this.pattern2Show = true;
    } else if (!this.pattern3Show) {
      this.pattern3Show = true;
    } else if (!this.pattern4Show) {
      this.pattern4Show = true;
    } else if (!this.pattern5Show) {
      this.pattern5Show = true;
    }
  }


  removePattern(pattern:number) {
    if (pattern == 1) {
      this.pattern1 = '';
      this.gridOptions.context.pattern1 = 'NO DATA';
      this.gridOptions.context.pattern1Color = '#000000';
      this.gridOptions.context.pattern1List = [];
      this.pattern1Show = false;
    } else if (pattern == 2) {
      this.pattern2 = '';
      this.gridOptions.context.pattern2 = 'NO DATA';
      this.gridOptions.context.pattern2Color = '#000000';
      this.gridOptions.context.pattern2List = [];
      this.pattern2Show = false;
    } else if (pattern == 3) {
      this.pattern3 = '';
      this.gridOptions.context.pattern3 = 'NO DATA';
      this.gridOptions.context.pattern3Color = '#000000';
      this.gridOptions.context.pattern3List = [];
      this.pattern3Show = false;
    } else if (pattern == 4) {
      this.pattern4 = '';
      this.gridOptions.context.pattern4 = 'NO DATA';
      this.gridOptions.context.pattern4Color = '#000000';
      this.gridOptions.context.pattern4List = [];
      this.pattern4Show = false;
    } else if (pattern == 5) {
      this.pattern5 = '';
      this.gridOptions.context.pattern5 = 'NO DATA';
      this.gridOptions.context.pattern5Color = '#000000';
      this.gridOptions.context.pattern5List = [];
      this.pattern5Show = false;
    }

    this.gridOptions.api.refreshView();
  }

  clearPatterns() {
    this.pattern1 = '';
    this.pattern2 = '';
    this.pattern3 = '';
    this.pattern4 = '';
    this.pattern5 = '';
    this.gridOptions.context.pattern1 = 'NO DATA';
    this.gridOptions.context.pattern2 = 'NO DATA';
    this.gridOptions.context.pattern3 = 'NO DATA';
    this.gridOptions.context.pattern4 = 'NO DATA';
    this.gridOptions.context.pattern5 = 'NO DATA';
    this.gridOptions.context.pattern1Color = '#000000';
    this.gridOptions.context.pattern2Color = '#000000';
    this.gridOptions.context.pattern3Color = '#000000';
    this.gridOptions.context.pattern4Color = '#000000';
    this.gridOptions.context.pattern5Color = '#000000';
    this.gridOptions.context.pattern1List = [];
    this.gridOptions.context.pattern2List = [];
    this.gridOptions.context.pattern3List = [];
    this.gridOptions.context.pattern4List = [];
    this.gridOptions.context.pattern5List = [];
    this.posActual = -1;
    this.gridOptions.api.deselectAll();
    this.gridOptions.api.refreshView();
  }

  searchByPatterns(pattern1Color:string, pattern2Color:string, pattern3Color:string, pattern4Color:string, pattern5Color:string) {
    this.gridOptions.context.pattern1 = this.pattern1;
    this.gridOptions.context.pattern2 = this.pattern2;
    this.gridOptions.context.pattern3 = this.pattern3;
    this.gridOptions.context.pattern4 = this.pattern4;
    this.gridOptions.context.pattern5 = this.pattern5;
    this.gridOptions.context.pattern1Color = pattern1Color;
    this.gridOptions.context.pattern2Color = pattern2Color;
    this.gridOptions.context.pattern3Color = pattern3Color;
    this.gridOptions.context.pattern4Color = pattern4Color;
    this.gridOptions.context.pattern5Color = pattern5Color;

    let i:number = 0;
    this.gridOptions.rowData.map(e => {
      if (((this.gridOptions.context.pattern1 != undefined) && this.gridOptions.context.pattern1 != '') &&
        (e.message.toUpperCase().indexOf(this.gridOptions.context.pattern1.toUpperCase()) > -1)) {
        if (this.gridOptions.context.pattern1List.indexOf(i) == -1) {
          this.gridOptions.context.pattern1List.push(i);
        }
      } else if (((this.gridOptions.context.pattern2 != undefined) && this.gridOptions.context.pattern2 != '') &&
        (e.message.toUpperCase().indexOf(this.gridOptions.context.pattern2.toUpperCase()) > -1)) {
        if (this.gridOptions.context.pattern2List.indexOf(i) == -1) {
          this.gridOptions.context.pattern2List.push(i);
        }
      } else if (((this.gridOptions.context.pattern3 != undefined) && this.gridOptions.context.pattern3 != '') &&
        (e.message.toUpperCase().indexOf(this.gridOptions.context.pattern3.toUpperCase()) > -1)) {
        if (this.gridOptions.context.pattern3List.indexOf(i) == -1) {
          this.gridOptions.context.pattern3List.push(i);
        }
      } else if (((this.gridOptions.context.pattern4 != undefined) && this.gridOptions.context.pattern4 != '') &&
        (e.message.toUpperCase().indexOf(this.gridOptions.context.pattern4.toUpperCase()) > -1)) {
        if (this.gridOptions.context.pattern4List.indexOf(i) == -1) {
          this.gridOptions.context.pattern4List.push(i);
        }
      } else if (((this.gridOptions.context.pattern5 != undefined) && this.gridOptions.context.pattern5 != '') &&
        (e.message.toUpperCase().indexOf(this.gridOptions.context.pattern5.toUpperCase()) > -1)) {
        if (this.gridOptions.context.pattern5List.indexOf(i) == -1) {
          this.gridOptions.context.pattern5List.push(i);
        }
      }

      i++;
    })
    this.gridOptions.api.refreshView();
  }

  next(pattern:number) {

    if (pattern === 1) {

      this.gridOptions.context.pattern1List.sort(this.sorted);

      if (this.posActual == -1) {
        this.pattern1Pos = 0;
      } else {
        this.pattern1Pos = this.getNextPosition(this.posActual, this.gridOptions.context.pattern1List);
        if (this.pattern1Pos === -1) {
          this.pattern1Pos = 0;
        }
      }

      this.posActual = this.gridOptions.context.pattern1List[this.pattern1Pos];

      this.gridOptions.api.selectIndex(this.gridOptions.context.pattern1List[this.pattern1Pos]);
      this.gridOptions.api.ensureIndexVisible(this.gridOptions.context.pattern1List[this.pattern1Pos]);
    } else if (pattern === 2) {

      this.gridOptions.context.pattern2List.sort(this.sorted);

      if (this.posActual == -1) {
        this.pattern2Pos = 0;
      } else {
        this.pattern2Pos = this.getNextPosition(this.posActual, this.gridOptions.context.pattern2List);
        if (this.pattern2Pos === -1) {
          this.pattern2Pos = 0;
        }
      }

      this.posActual = this.gridOptions.context.pattern2List[this.pattern2Pos];

      this.gridOptions.api.selectIndex(this.gridOptions.context.pattern2List[this.pattern2Pos]);
      this.gridOptions.api.ensureIndexVisible(this.gridOptions.context.pattern2List[this.pattern2Pos]);
    } else if (pattern === 3) {

      this.gridOptions.context.pattern3List.sort(this.sorted);

      if (this.posActual == -1) {
        this.pattern3Pos = 0;
      } else {
        this.pattern3Pos = this.getNextPosition(this.posActual, this.gridOptions.context.pattern3List);
        if (this.pattern3Pos === -1) {
          this.pattern3Pos = 0;
        }
      }

      this.posActual = this.gridOptions.context.pattern3List[this.pattern3Pos];

      this.gridOptions.api.selectIndex(this.gridOptions.context.pattern3List[this.pattern3Pos]);
      this.gridOptions.api.ensureIndexVisible(this.gridOptions.context.pattern3List[this.pattern3Pos]);
    } else if (pattern === 4) {

      this.gridOptions.context.pattern4List.sort(this.sorted);

      if (this.posActual == -1) {
        this.pattern4Pos = 0;
      } else {
        this.pattern4Pos = this.getNextPosition(this.posActual, this.gridOptions.context.pattern4List);
        if (this.pattern4Pos === -1) {
          this.pattern4Pos = 0;
        }
      }

      this.posActual = this.gridOptions.context.pattern4List[this.pattern4Pos];

      this.gridOptions.api.selectIndex(this.gridOptions.context.pattern4List[this.pattern4Pos]);
      this.gridOptions.api.ensureIndexVisible(this.gridOptions.context.pattern4List[this.pattern4Pos]);
    } else if (pattern === 5) {

      this.gridOptions.context.pattern5List.sort(this.sorted);

      if (this.posActual == -1) {
        this.pattern5Pos = 0;
      } else {
        this.pattern5Pos = this.getNextPosition(this.posActual, this.gridOptions.context.pattern5List);
        if (this.pattern5Pos === -1) {
          this.pattern5Pos = 0;
        }
      }

      this.posActual = this.gridOptions.context.pattern5List[this.pattern5Pos];

      this.gridOptions.api.selectIndex(this.gridOptions.context.pattern5List[this.pattern5Pos]);
      this.gridOptions.api.ensureIndexVisible(this.gridOptions.context.pattern5List[this.pattern5Pos]);
    }

  }


  prev(pattern:number) {
    if (pattern === 1) {

      this.gridOptions.context.pattern1List.sort(this.sorted);

      if (this.posActual == -1) {
        this.pattern1Pos = this.gridOptions.context.pattern1List.length - 1;
      } else {
        this.pattern1Pos = this.getPrevPosition(this.posActual, this.gridOptions.context.pattern1List);
        if (this.pattern1Pos === -1) {
          this.pattern1Pos = this.gridOptions.context.pattern1List.length - 1;
        }
      }

      this.posActual = this.gridOptions.context.pattern1List[this.pattern1Pos];

      this.gridOptions.api.selectIndex(this.gridOptions.context.pattern1List[this.pattern1Pos]);
      this.gridOptions.api.ensureIndexVisible(this.gridOptions.context.pattern1List[this.pattern1Pos]);
    } else if (pattern === 2) {

      this.gridOptions.context.pattern2List.sort(this.sorted);

      if (this.posActual == -1) {
        this.pattern2Pos = this.gridOptions.context.pattern2List.length - 1;
      } else {
        this.pattern2Pos = this.getPrevPosition(this.posActual, this.gridOptions.context.pattern2List);
        if (this.pattern2Pos === -1) {
          this.pattern2Pos = this.gridOptions.context.pattern2List.length - 1;
        }
      }

      this.posActual = this.gridOptions.context.pattern2List[this.pattern2Pos];

      this.gridOptions.api.selectIndex(this.gridOptions.context.pattern2List[this.pattern2Pos]);
      this.gridOptions.api.ensureIndexVisible(this.gridOptions.context.pattern2List[this.pattern2Pos]);
    } else if (pattern === 3) {

      this.gridOptions.context.pattern3List.sort(this.sorted);

      if (this.posActual == -1) {
        this.pattern3Pos = this.gridOptions.context.pattern3List.length - 1;
      } else {
        this.pattern3Pos = this.getPrevPosition(this.posActual, this.gridOptions.context.pattern3List);
        if (this.pattern3Pos === -1) {
          this.pattern3Pos = this.gridOptions.context.pattern3List.length - 1;
        }
      }

      this.posActual = this.gridOptions.context.pattern3List[this.pattern3Pos];

      this.gridOptions.api.selectIndex(this.gridOptions.context.pattern3List[this.pattern3Pos]);
      this.gridOptions.api.ensureIndexVisible(this.gridOptions.context.pattern3List[this.pattern3Pos]);
    } else if (pattern === 4) {

      this.gridOptions.context.pattern4List.sort(this.sorted);

      if (this.posActual == -1) {
        this.pattern4Pos = this.gridOptions.context.pattern4List.length - 1;
      } else {
        this.pattern4Pos = this.getPrevPosition(this.posActual, this.gridOptions.context.pattern4List);
        if (this.pattern4Pos === -1) {
          this.pattern4Pos = this.gridOptions.context.pattern4List.length - 1;
        }
      }

      this.posActual = this.gridOptions.context.pattern4List[this.pattern4Pos];

      this.gridOptions.api.selectIndex(this.gridOptions.context.pattern4List[this.pattern4Pos]);
      this.gridOptions.api.ensureIndexVisible(this.gridOptions.context.pattern4List[this.pattern4Pos]);
    } else if (pattern === 5) {

      this.gridOptions.context.pattern5List.sort(this.sorted);

      if (this.posActual == -1) {
        this.pattern5Pos = this.gridOptions.context.pattern5List.length - 1;
      } else {
        this.pattern5Pos = this.getPrevPosition(this.posActual, this.gridOptions.context.pattern5List);
        if (this.pattern5Pos === -1) {
          this.pattern5Pos = this.gridOptions.context.pattern5List.length - 1;
        }
      }

      this.posActual = this.gridOptions.context.pattern5List[this.pattern5Pos];

      this.gridOptions.api.selectIndex(this.gridOptions.context.pattern5List[this.pattern5Pos]);
      this.gridOptions.api.ensureIndexVisible(this.gridOptions.context.pattern5List[this.pattern5Pos]);
    }
  }

  private createColumnDefs() {

    let cellRendererLevel = function (params) {
      let css:string;
      let _class:string;
      if (params.data.level === 'ERROR') {
        _class = 'label-danger';
      } else if (params.data.level === 'WARN') {
        _class = 'label-warning';
      } else if (params.data.level === 'INFO') {
        _class = 'label-info';
      } else if (params.data.level === 'DEBUG') {
        _class = 'label-success';
      } else {
        _class = '';
      }

      css = '<span class="label ' + _class + '"> ' + (params.data.level == undefined ? '' : params.data.level) + '</span>';
      return css;
    }

    let cellRenderer = function (params) {
      return '<span title="the tooltip" style=" text-overflow: clip; overflow: visible; white-space: normal">' + params.data.message + '</span>';
    }

    let getCellCss = function (params, css) {
      css['border-color'] = 'black';
      css['border-top'] = '1px';
      css['border-left'] = '1px';
      if (((params.context.pattern1 != undefined) && params.context.pattern1 != '') &&
        (params.data.message.toUpperCase().indexOf(params.context.pattern1.toUpperCase()) > -1)) {
        css['color'] = params.context.pattern1Color;
      } else if (((params.context.pattern2 != undefined) && params.context.pattern2 != '') &&
        (params.data.message.toUpperCase().indexOf(params.context.pattern2.toUpperCase()) > -1)) {
        css['color'] = params.context.pattern2Color;
      } else if (((params.context.pattern3 != undefined) && params.context.pattern3 != '') &&
        (params.data.message.toUpperCase().indexOf(params.context.pattern3.toUpperCase()) > -1)) {
        css['color'] = params.context.pattern3Color;
      } else if (((params.context.pattern4 != undefined) && params.context.pattern4 != '') &&
        (params.data.message.toUpperCase().indexOf(params.context.pattern4.toUpperCase()) > -1)) {
        css['color'] = params.context.pattern4Color;
      } else if (((params.context.pattern5 != undefined) && params.context.pattern5 != '') &&
        (params.data.message.toUpperCase().indexOf(params.context.pattern5.toUpperCase()) > -1)) {
        css['color'] = params.context.pattern5Color;
      }
      return css;
    }


    let cellStyle = function (params) {
      let css:any = {};
      css = getCellCss(params, css);
      return css;
    }

    let cellStyleCenter = function (params) {
      let css:any = {'text-align': 'center'};
      css = getCellCss(params, css);
      return css;
    }

    this.columnDefs = [
      {
        headerName: '#', width: 30, checkboxSelection: false, suppressSorting: true,
        suppressMenu: true, pinned: true, cellStyle: cellStyleCenter
      },
      {
        headerName: 'Time', width: 200, checkboxSelection: false, suppressSorting: true, field: "time",
        suppressMenu: true, pinned: false, cellStyle: cellStyleCenter
      },
      {
        headerName: 'Level', width: 60, checkboxSelection: false, suppressSorting: true, field: "level",
        suppressMenu: true, pinned: false, cellRenderer: cellRendererLevel, cellStyle: cellStyleCenter
      },
      {
        headerName: 'Type', width: 50, checkboxSelection: false, suppressSorting: true, field: "type",
        suppressMenu: true, pinned: false, cellStyle: cellStyleCenter
      },
      {
        headerName: 'Thread', width: 170, checkboxSelection: false, suppressSorting: true, field: "thread",
        suppressMenu: true, pinned: false, cellStyle: cellStyle
      },
      {
        headerName: 'Message', width: 600, checkboxSelection: false, suppressSorting: true, field: "message",
        suppressMenu: true, pinned: false, cellRenderer: function (params) {
        return '<span style="text-overflow: clip; overflow: visible; white-space: normal" title="Message">' + (params.data.message == undefined ? '' : params.data.message) + '</span>';
      }, cellStyle: cellStyle, focusCell: true
      },
      {
        headerName: 'Logger', width: 300, checkboxSelection: false, suppressSorting: true, field: "logger",
        suppressMenu: true, pinned: false, cellStyle: cellStyle
      },
      {
        headerName: 'Host', width: 300, checkboxSelection: false, suppressSorting: true, field: "host",
        suppressMenu: true, pinned: false, cellStyle: cellStyle
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
    this.calculateRowCount();
    if (!this.scrollLock) {
      if (this.gridOptions.rowData.length > 0) {
        this.gridOptions.api.selectIndex(this.gridOptions.rowData.length - 1);
        this.gridOptions.api.ensureIndexVisible(this.gridOptions.rowData.length - 1);
      }
    }
    this.searchByPatterns(this.gridOptions.context.pattern1Color, this.gridOptions.context.pattern2Color, this.gridOptions.context.pattern3Color, this.gridOptions.context.pattern4Color, this.gridOptions.context.pattern5Color)
  }


  private onCellClicked($event) {
    console.log('onCellClicked: ' + $event.rowIndex + ' ' + $event.colDef.field);
    let logEntry = this.rowData[$event.rowIndex];
    //this.selectedLogEntry = JSON.stringify(logEntry, null, 2);
    //this.selectedLogMessage = logEntry.message;
  }

  private onCellValueChanged($event) {
    console.log('onCellValueChanged: ', $event.oldValue, ' to ', $event.newValue);
  }

  private onCellDoubleClicked($event) {
    console.log('onCellDoubleClicked: ', $event.rowIndex, ' ', $event.colDef.field);
  }

  private onCellContextMenu($event) {
    console.log('onCellContextMenu: ', $event.rowIndex, ' ', $event.colDef.field);
  }

  private onCellFocused($event) {
    console.log('onCellFocused: (', $event.rowIndex, ',', $event.colIndex, ')', $event);
  }

  private onRowSelected($event) {
    console.log('onRowSelected: ', $event);
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
    console.log('onRowClicked: ', $event);
  }

  private onQuickFilterChanged($event) {
    this.gridOptions.api.setQuickFilter($event.target.value);
  }

  private onColumnEvent($event) {
    console.log('onColumnEvent: ', $event);
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
