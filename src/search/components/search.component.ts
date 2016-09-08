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


import {NameListService} from '../../shared/services/name-list.service';


const ES_URL = 'http://jenkins:jenkins130@elasticsearch.kurento.org:9200/';
const INDEX = "<kurento-*>";
const RESULTS_PER_REQUEST = 50;

@Component({
  selector: 'sd-search',
  templateUrl: './search/components/search.component.html',
  styleUrls: ['./search/components/search.component.css'],
  providers: HTTP_PROVIDERS,
  directives: [FORM_DIRECTIVES, CORE_DIRECTIVES]
})

export class SearchComponent {
  constructor(private http:Http) {
  }

  private defaultFrom = new Date(new Date().valueOf() - (10 * 60 * 60 * 1000));
  private defaultTo = new Date(new Date().valueOf() - (1 * 60 * 60 * 1000));
  private guiquery:string;

  testType:boolean = false;
  clusterType:boolean = true;
  kmsType:boolean = false;

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
      queryes.filtered.filter.bool.should.push({
        "terms": filter
      })
    } else if (values.length == 1) {
      filter[field] = values[0];
      queryes.filtered.filter.bool.should.push({
        "match": filter
      })
    }
  }


  getDefaultFromValue() {
    return toInputLiteral(this.defaultFrom);
  }

  getDefaultToValue() {
    return toInputLiteral(this.defaultTo);
  }

  search(from:string, to:string, valueToSearch:string, append:boolean = false) {
    console.log("Searching:", from, to, valueToSearch);

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
            "should": [
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

    let loggers = this.processCommaSeparatedValue(valueToSearch);
    this.addTermFilter(queryes, 'loggername', loggers);

    let hosts = this.processCommaSeparatedValue(valueToSearch);
    this.addTermFilter(queryes, 'host', hosts);

    let message = this.processCommaSeparatedValue(valueToSearch);
    this.addTermFilter(queryes, 'message', message);

    let thread = this.processCommaSeparatedValue(valueToSearch);
    this.addTermFilter(queryes, 'threadid', thread);

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

        let data = res.json()
        console.log("Res:", res);
        console.log("Data:", data);


      }, (err:Response) => {
        console.error("Error:", err)
      });
  }

}
/**
 * Created by rbenitez on 14/4/16.
 */
