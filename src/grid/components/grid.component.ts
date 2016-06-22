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

import {Component, Input, Output, EventEmitter} from 'angular2/core';
import {Http, Response, HTTP_PROVIDERS, Headers, RequestOptions, RequestMethod, Request} from 'angular2/http'
import {CORE_DIRECTIVES, FORM_DIRECTIVES} from 'angular2/common';
import {getGerritUrl} from './../../shared/utils/Utils';
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

  ngOnInit() {
    this.gridHeight = (window.innerHeight - 200) + "px";
  }

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

    this.modalMessage = '';
    this.createColumnDefs();
  }

  @Input() rowData:any[] = [];
  @Input() waiting:boolean = false;
  @Input() showGrid:boolean = false;

  @Output() updateDates:EventEmitter = new EventEmitter();
  @Output() updateRows:EventEmitter = new EventEmitter();

  // Grid
  private gridOptions:GridOptions;
  private columnDefs:any[];
  private rowCount:string;

  private modalMessage:string = '';

  loggers:string;
  hosts:string;
  message:string;
  thread:string;

  gridHeight:string;

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

  pattern1Found:number = 0;
  pattern2Found:number = 0;
  pattern3Found:number = 0;
  pattern4Found:number = 0;
  pattern5Found:number = 0;

  numPattern:number = 0;

  scrollLock:boolean = false;

  private rowDataSize:number = -1;
  private currentRowSelectected:number = -1;

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

  onResize(event) {
    this.gridHeight = (event.currentTarget.innerHeight - 200) + "px";
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
      this.pattern1Found = 0;
    } else if (pattern == 2) {
      this.pattern2 = '';
      this.gridOptions.context.pattern2 = 'NO DATA';
      this.gridOptions.context.pattern2Color = '#000000';
      this.gridOptions.context.pattern2List = [];
      this.pattern2Show = false;
      this.pattern2Found = 0;
    } else if (pattern == 3) {
      this.pattern3 = '';
      this.gridOptions.context.pattern3 = 'NO DATA';
      this.gridOptions.context.pattern3Color = '#000000';
      this.gridOptions.context.pattern3List = [];
      this.pattern3Show = false;
      this.pattern3Found = 0;
    } else if (pattern == 4) {
      this.pattern4 = '';
      this.gridOptions.context.pattern4 = 'NO DATA';
      this.gridOptions.context.pattern4Color = '#000000';
      this.gridOptions.context.pattern4List = [];
      this.pattern4Show = false;
      this.pattern4Found = 0;
    } else if (pattern == 5) {
      this.pattern5 = '';
      this.gridOptions.context.pattern5 = 'NO DATA';
      this.gridOptions.context.pattern5Color = '#000000';
      this.gridOptions.context.pattern5List = [];
      this.pattern5Show = false;
      this.pattern5Found = 0;
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
    this.pattern1Found = 0;
    this.pattern2Found = 0;
    this.pattern3Found = 0;
    this.pattern4Found = 0;
    this.pattern5Found = 0;
    this.posActual = -1;
    this.currentRowSelectected = -1;
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
    this.gridOptions.context.pattern1List = [];
    this.gridOptions.context.pattern2List = [];
    this.gridOptions.context.pattern3List = [];
    this.gridOptions.context.pattern4List = [];
    this.gridOptions.context.pattern5List = [];
    this.posActual = -1;

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
    this.pattern1Found = this.gridOptions.context.pattern1List.length;
    this.pattern2Found = this.gridOptions.context.pattern2List.length;
    this.pattern3Found = this.gridOptions.context.pattern3List.length;
    this.pattern4Found = this.gridOptions.context.pattern4List.length;
    this.pattern5Found = this.gridOptions.context.pattern5List.length;
    if (this.pattern1Found > 0) {
      this.next(1);
    } else if (this.pattern2Found > 0) {
      this.next(2);
    } else if (this.pattern3Found > 0) {
      this.next(3);
    } else if (this.pattern4Found > 0) {
      this.next(4);
    } else if (this.pattern5Found > 0) {
      this.next(5);
    }

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
      if (params.data.level.toUpperCase() === 'ERROR') {
        _class = 'label-danger';
      } else if (params.data.level.toUpperCase() === 'WARN') {
        _class = 'label-warning';
      } else if (params.data.level.toUpperCase() === 'INFO') {
        _class = 'label-info';
      } else if (params.data.level.toUpperCase() === 'DEBUG') {
        _class = 'label-success';
      } else {
        _class = '';
      }

      css = '<span class="label ' + _class + '"> ' + (params.data.level == undefined ? '' : params.data.level.toUpperCase()) + '</span>';
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

    let colorsByElements = [];

    function getColor(n) {
      var colores_g = ["#80aaff", "#7fe6da", "#74c476", "#a1d99b", "#c7e9c0", "#e66a6a", "#9e9ac8", "#bcbddc", "#dadaeb", "#636363", "#969696", "#bdbdbd", "#d9dddd",
        "#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#756bb1", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"
      ];
      return colores_g[n % colores_g.length];
    }

    let n = 0;

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
        headerName: 'Code', width: 45, checkboxSelection: false, suppressSorting: true, field: "urlCode",
        suppressMenu: true, pinned: true, cellStyle: cellStyleCenter, cellRenderer: function (params) {
        return (params.data.urlCode == '' ? '' : '<a href="' + params.data.urlCode + '" target="_blank">Go</a>');
      }
      },
      {
        headerName: 'Time', width: 200, checkboxSelection: false, suppressSorting: true, field: "time",
        suppressMenu: true, pinned: false, cellStyle: cellStyleCenter
      },
      {
        headerName: 'Node', width: 60, checkboxSelection: false, suppressSorting: true, field: "node",
        suppressMenu: true, pinned: false, cellStyle: function (params) {
        if (colorsByElements[params.data.host] == undefined) {
          colorsByElements[params.data.host] = getColor(n);
          n++;
        }
        return {
          'background-color': '' + colorsByElements[params.data.host] + '',
          'border-color': 'black',
          'border-top': '1px',
          'border-left': '1px'
        };
      }
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
        suppressMenu: true, pinned: false, cellRenderer: function (params) {
        if (params.data.thread != undefined && params.data.thread.indexOf('REMOVE') > -1) {
          return '<span class="label label-info" style="cursor:pointer">' + (params.data.thread == undefined ? '' : params.data.thread) + '</span>';
        } else {
          return '<span style="text-overflow: clip; overflow: visible; white-space: normal" title="Message">' + (params.data.thread == undefined ? '' : params.data.thread) + '</span>';
        }
      }, cellStyle: function(params) {
        if (params.data.thread != undefined && params.data.thread.indexOf('REMOVE') > -1) {
          return cellStyleCenter(params);
        }else {
          return cellStyle(params);
        }
      }
      },
      {
        headerName: 'Message', width: 600, checkboxSelection: false, suppressSorting: true, field: "message",
        suppressMenu: true, pinned: false, cellRenderer: function (params) {
        if (params.data.message.indexOf('Init Sub-Search') > -1) {
          return '<span style="color: green;font-weight:bold; text-overflow: clip; overflow: visible; white-space: normal" title="Message">' + (params.data.message == undefined ? '' : params.data.message) + '</span>';
        } else if (params.data.message.indexOf('End Sub-Search') > -1) {
          return '<span style="color: red;font-weight:bold; text-overflow: clip; overflow: visible; white-space: normal" title="Message">' + (params.data.message == undefined ? '' : params.data.message) + '</span>';
        } else {
          return '<span style="text-overflow: clip; overflow: visible; white-space: normal" title="Message">' + (params.data.message == undefined ? '' : params.data.message) + '</span>';
        }
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

  cleanSubSearch(rowId:number, searchId:number) {
    while (this.rowData[rowId + 1] != undefined) {
      if (this.rowData[rowId + 1].message.indexOf(searchId) > -1){
        this.rowData.splice(rowId + 1, 1);
        break;
      }
      this.rowData.splice(rowId + 1, 1);
    }
    this.rowData.splice(rowId, 1);
    this.rowData = this.rowData.slice();
    this.updateRows.emit(this.rowData);
  }

  private closeModal() {
    this.modalMessage = '';
  }

  private calculateRowCount() {
    if (this.gridOptions.api && this.rowData) {
      var model = this.gridOptions.api.getModel();
      var totalRows = this.rowData.length;
      var processedRows = model.getRowCount();
      this.rowCount = processedRows.toLocaleString() + ' / ' + totalRows.toLocaleString();
      if (this.rowDataSize != this.rowData.length) {
        this.rowDataSize = this.rowData.length;
      }
    }
  }

  private onModelUpdated() {
    let rowSelect = -1;
    if (this.scrollLock) {
      rowSelect = this.currentRowSelectected;
    } else if (!this.scrollLock && this.rowDataSize == this.rowData.length && this.currentRowSelectected != -1 && this.currentRowSelectected - 1 != this.rowData.length) {
      rowSelect = this.currentRowSelectected;
    } else {
      rowSelect = this.gridOptions.rowData.length - 1;
    }
    if (this.gridOptions.rowData.length > 0) {
      this.gridOptions.api.selectIndex(rowSelect);
      this.gridOptions.api.ensureIndexVisible(rowSelect);
    }
    this.calculateRowCount();
    this.searchByPatterns(this.gridOptions.context.pattern1Color, this.gridOptions.context.pattern2Color, this.gridOptions.context.pattern3Color, this.gridOptions.context.pattern4Color, this.gridOptions.context.pattern5Color)
  }


  private onCellClicked($event) {
    this.currentRowSelectected = $event.rowIndex;
    this.gridOptions.api.selectIndex($event.rowIndex);
    this.gridOptions.api.ensureIndexVisible($event.rowIndex);

    if ($event.colDef.headerName == "Thread" && $event.data.thread != undefined && $event.data.thread.indexOf('REMOVE') > -1) {
      this.cleanSubSearch($event.rowIndex, $event.data.message.split(" ")[2])
    }
  }

  private onCellValueChanged($event) {
    console.log('onCellValueChanged: ', $event.oldValue, ' to ', $event.newValue);
  }

  private onCellDoubleClicked($event) {
    this.modalMessage = JSON.stringify($event.data, null, 4);
  }

  private onCellContextMenu($event) {
    console.log('onCellContextMenu: ', $event.rowIndex, ' ', $event.colDef.field);
  }

  private onCellFocused($event) {
    console.log('onCellFocused: (', $event.rowIndex, ',', $event.colIndex, ')', $event);
  }

  private onRowSelected($event) {
    if ($event.node.selected) {
      this.currentRowSelectected = $event.node.id;

      let initDate:String = this.rowData[$event.node.id].time;
      let endDate:String;
      let i:number = 1;
      do {
        let endRow = this.rowData[$event.node.id + i];
        if (endRow != undefined) {
          endDate = endRow.time;
        }
        if (endDate == "") {
          endDate = undefined;
        }
        i++;
      } while (i < this.rowData.length && endDate == undefined)

      let event = {
        position: $event.node.id,
        initDate: initDate,
        endDate: endDate
      }
      // Emit event for seachAdvance can update the dates for adding more data from position and using initDate and endDate
      this.updateDates.emit(event);
    }
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
    if ($event.type == "columnEverythingChanged" || ($event.type == "columnResized" && $event.finished)) {
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

}
/**
 * Created by rbenitez on 14/4/16.
 */
