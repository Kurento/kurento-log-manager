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
import {dateToInputLiteral, ES_URL, INDEX, RESULTS_PER_REQUEST} from './../../shared/utils/Utils';
import {ElasticSearchService} from './../../shared/services/elasticSearch.service';
import {GridComponent} from './../../grid/components/grid.component'

import 'ag-grid-enterprise/main';

@Component({
  selector: 'sd-search',
  templateUrl: './search/components/search.component.html',
  styleUrls: ['./search/components/search.component.css'],
  providers: [HTTP_PROVIDERS, ElasticSearchService],
  directives: [FORM_DIRECTIVES, CORE_DIRECTIVES, GridComponent]
})

export class SearchComponent {
  constructor(private _elasticSearchService:ElasticSearchService) {
    this.showGrid = false;
  }


  private defaultFrom = new Date(new Date().valueOf() - (10 * 60 * 60 * 1000));
  private defaultTo = new Date(new Date().valueOf() - (1 * 60 * 60 * 1000));
  private guiquery:string;

  // show/hide the grid and spinner
  private rowData:any[] = [];
  private showGrid:boolean;
  private waiting:boolean = false;

  testType:boolean = true;
  clusterType:boolean = true;
  kmsType:boolean = true;

  debugLevel:boolean = true;
  infoLevel:boolean = true;
  warnLevel:boolean = true;
  errorLevel:boolean = true;

  urlElastic:string = "http://localhost:9200/";
  loggers:string;
  hosts:string;
  message:string;
  thread:string;
  simpleSearch:string;
  maxResults:number = 50;


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
      let filterValue = "{\"match\":{\"" + field + "\" : {\"query\" : \"" + values.join(" ") + "\",\"type\": \"phrase\" }}}";
      queryes.filtered.filter.bool.must.push(JSON.parse(filterValue))
    }
  }

  getDefaultFromValue() {
    return dateToInputLiteral(this.defaultFrom);
  }

  getDefaultToValue() {
    return dateToInputLiteral(this.defaultTo);
  }

  search(from:string, to:string, append:boolean = false) {
    console.log("Searching:", from, to);

    this.showGrid = false;
    this.waiting = true;
    this.rowData = [];
    // All variables (boolean) have a default value as true
    // The search will be on loggers + hosts + message + thread

    let query = "";

    let types:Array<string> = [];

    if (this.clusterType) {
      types.push('cluster');
      types.push('boot');
    }

    if (this.kmsType) {
      types.push('kms');
    }

    if (this.testType) {
      types.push('test');
    }

    let logLevels:Array<string> = [];

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

    let url = this.urlElastic + INDEX + '/_search?scroll=1m&filter_path=_scroll_id,hits.hits._source,hits.hits._type';

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
    this.addTermFilter(queryes, '_type', types);

    /* let loggers = this.processCommaSeparatedValue(valueToSearch);
     this.addTermFilter(queryes, 'loggername', loggers);

     let hosts = this.processCommaSeparatedValue(valueToSearch);
     this.addTermFilter(queryes, 'host', hosts);*/
    let message = this.processCommaSeparatedValue(this.simpleSearch);
    this.addTermFilter(queryes, 'message', message);

    /*    let thread = this.processCommaSeparatedValue(valueToSearch);
     this.addTermFilter(queryes, 'threadid', thread);*/

    console.log("Query: ", queryes);
    console.log('-----------------------------------------------------------------');

    let esquery = {
      sort: [
        {'@timestamp': sort}
      ],
      query: queryes,
      size: this.maxResults,
      _source: ['host', 'threadid', 'loggername', 'message', 'loglevel', 'logmessage', '@timestamp']
    };


    this._elasticSearchService.internalSearch(url, esquery, this.maxResults, append).subscribe(
      data => {
        console.log("Data:", data);
        this.rowData = data;
        this.showGrid = true;
        this.waiting = false;
      },
      err => console.log('Error', err)
    )
  }

}
/**
 * Created by rbenitez on 14/4/16.
 */
