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

import {Component, Inject} from 'angular2/core';
import {Http, Response, HTTP_PROVIDERS, Headers, RequestOptions, RequestMethod, Request} from 'angular2/http'
import {CORE_DIRECTIVES, FORM_DIRECTIVES} from 'angular2/common';
import {dateToInputLiteral, ES_URL, INDEX, RESULTS_PER_REQUEST} from './../../shared/utils/Utils';
import {ElasticSearchService} from './../../shared/services/elasticSearch.service';
import {GridComponent} from './../../grid/components/grid.component'
import {RouteParams} from 'angular2/router';

import 'ag-grid-enterprise/main';

@Component({
  selector: 'sd-search-advance',
  templateUrl: './searchAdvance/components/searchAdvance.component.html',
  styleUrls: ['./searchAdvance/components/searchAdvance.component.css'],
  providers: [HTTP_PROVIDERS, ElasticSearchService],
  directives: [FORM_DIRECTIVES, CORE_DIRECTIVES, GridComponent]
})

export class SearchAdvanceComponent {
  constructor(private _elasticSearchService:ElasticSearchService, @Inject(RouteParams) params:RouteParams) {
    this.showGrid = false;

    let autoSearch:boolean = false;

    console.log(decodeURIComponent(params.get('urlElastic')));
    if (params.get('urlElastic') != null) {
      this.urlElastic = decodeURIComponent(params.get('urlElastic'));
      autoSearch = true;
    }

    if (params.get('message') != null) {
      this.message = decodeURIComponent(params.get('message'));
      autoSearch = true;
    }

    if (params.get('loggers') != null) {
      this.loggers = decodeURIComponent(params.get('loggers'));
      autoSearch = true;
    }

    if (params.get('hosts') != null) {
      this.hosts = decodeURIComponent(params.get('hosts'));
      autoSearch = true;
    }

    if (params.get('thread') != null) {
      this.thread = decodeURIComponent(params.get('thread'));
      autoSearch = true;
    }

    if (params.get('maxResults') != null) {
      this.maxResults = parseInt(decodeURIComponent(params.get('maxResults')));
      autoSearch = true;
    }


    if (params.get('testType') == 'false') {
      autoSearch = true;
      this.testType = false;
    } else if (params.get('testType') == 'true') {
      autoSearch = true;
      this.testType = true;
    }

    if (params.get('clusterType') == 'false') {
      autoSearch = true;
      this.clusterType = false;
    } else if (params.get('clusterType') == 'true') {
      autoSearch = true;
      this.clusterType = true;
    }

    if (params.get('kmsType') == 'false') {
      autoSearch = true;
      this.kmsType = false;
    } else if (params.get('kmsType') == 'true') {
      autoSearch = true;
      this.kmsType = true;
    }


    if (params.get('debugLevel') == 'false') {
      autoSearch = true;
      this.debugLevel = false;
    } else if (params.get('debugLevel') == 'true') {
      autoSearch = true;
      this.debugLevel = true;
    }

    if (params.get('infoLevel') == 'false') {
      autoSearch = true;
      this.infoLevel = false;
    } else if (params.get('infoLevel') == 'true') {
      autoSearch = true;
      this.infoLevel = true;
    }

    if (params.get('warnLevel') == 'false') {
      autoSearch = true;
      this.warnLevel = false;
    } else if (params.get('warnLevel') == 'true') {
      autoSearch = true;
      this.warnLevel = true;
    }

    if (params.get('errorLevel') == 'false') {
      autoSearch = true;
      this.errorLevel = false;
    } else if (params.get('errorLevel') == 'true') {
      autoSearch = true;
      this.errorLevel = true;
    }

    if (params.get('from') != null) {
      autoSearch = true;
      this.defaultFrom = new Date(Date.parse(decodeURIComponent(params.get('from'))));
      this.defaultFrom.setTime(this.defaultFrom.getTime() + this.defaultFrom.getTimezoneOffset()*60*1000 );
    }

    if (params.get('to') != null) {
      autoSearch = true;
      this.defaultTo = new Date(Date.parse(decodeURIComponent(params.get('to'))));
      this.defaultTo.setTime(this.defaultTo.getTime() + this.defaultTo.getTimezoneOffset()*60*1000 );
    }

    if (autoSearch) {
      this.search(dateToInputLiteral(this.defaultFrom), dateToInputLiteral(this.defaultTo));
    }

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

  urlElastic:string = 'http://localhost:9200/';
  loggers:string;
  hosts:string;
  message:string;
  thread:string;
  maxResults:number = 50;
  urlCopied:string;


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

  copyToClipboard() {
    var copyTextarea = document.querySelector('.js-copytextarea');
    copyTextarea.select();
    document.execCommand("copy");
  }

  private generateCopyUrl(from:string, to:string) {

    this.urlCopied = document.URL + '?';
    if (this.urlElastic != undefined) {
      this.urlCopied += 'urlElastic=' + encodeURIComponent(this.urlElastic) + '&';
    }

    if (this.message != undefined) {
      this.urlCopied += 'message=' + encodeURIComponent(this.message) + '&';
    }

    if (this.loggers != undefined) {
      this.urlCopied += 'loggers=' + encodeURIComponent(this.loggers) + '&';
    }

    if (this.hosts != undefined) {
      this.urlCopied += 'hosts=' + encodeURIComponent(this.hosts) + '&';
    }

    if (this.thread != undefined) {
      this.urlCopied += 'thread=' + encodeURIComponent(this.thread) + '&';
    }

    if (this.maxResults != undefined) {
      this.urlCopied += 'maxResults=' + encodeURIComponent(String(this.maxResults)) + '&';
    }


    if (this.testType != undefined) {
      this.urlCopied += 'testType=' + encodeURIComponent(String(this.testType)) + '&';
    }

    if (this.clusterType != undefined) {
      this.urlCopied += 'clusterType=' + encodeURIComponent(String(this.clusterType)) + '&';
    }

    if (this.kmsType != undefined) {
      this.urlCopied += 'kmsType=' + encodeURIComponent(String(this.kmsType)) + '&';
    }


    if (this.debugLevel != undefined) {
      this.urlCopied += 'debugLevel=' + encodeURIComponent(String(this.debugLevel)) + '&';
    }

    if (this.infoLevel != undefined) {
      this.urlCopied += 'infoLevel=' + encodeURIComponent(String(this.infoLevel)) + '&';
    }

    if (this.warnLevel != undefined) {
      this.urlCopied += 'warnLevel=' + encodeURIComponent(String(this.warnLevel)) + '&';
    }

    if (this.errorLevel != undefined) {
      this.urlCopied += 'errorLevel=' + encodeURIComponent(String(this.errorLevel)) + '&';
    }

    if (from != undefined) {
      this.urlCopied += 'from=' + encodeURIComponent(from) + '&';
    }

    if (to != null) {
      this.urlCopied += 'to=' + encodeURIComponent(to) + '&';
    }
  }

  getDefaultFromValue() {
    return dateToInputLiteral(this.defaultFrom);
  }

  getDefaultToValue() {
    return dateToInputLiteral(this.defaultTo);
  }

  search(from:string, to:string, append:boolean = false) {
    this.generateCopyUrl(from, to);
    this.showGrid = false;
    this.waiting = true;
    this.rowData = [];
    // All variables (boolean) have a default value as true
    // The search will be on loggers + hosts + message + thread

    let types:Array<string> = [];

    if (this.testType) {
      types.push('test');
    }

    if (this.clusterType) {
      types.push('cluster');
      types.push('boot');
    }

    if (this.kmsType) {
      types.push('kms');
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

    let index = '<kurento-*-' + from.split('T')[0].replace(/-/g, '.') + ">";
    let url = this.urlElastic + INDEX + '/_search?scroll=1m&filter_path=_scroll_id,hits.hits._source,hits.hits._type';

    console.log("URL:", url);

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

    let loggers = this.processCommaSeparatedValue(this.loggers);
    this.addTermFilter(queryes, 'loggername', loggers);

    let hosts = this.processCommaSeparatedValue(this.hosts);
    this.addTermFilter(queryes, 'host', hosts);

    let message = this.processCommaSeparatedValue(this.message);
    this.addTermFilter(queryes, 'message', message);

    let thread = this.processCommaSeparatedValue(this.thread);
    this.addTermFilter(queryes, 'threadid', thread);

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
