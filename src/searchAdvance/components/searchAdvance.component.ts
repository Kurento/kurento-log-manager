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
import {dateToInputLiteral, ES_URL, INDEX, RESULTS_PER_REQUEST, getGerritUrl} from './../../shared/utils/Utils';
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
  private _scroll_id;
  private noMore = false;
  private dataForAdding;

  constructor(private _elasticSearchService:ElasticSearchService, @Inject(RouteParams) params:RouteParams) {
    this.showGrid = false;
    this.showError = false;

    let autoSearch:boolean = false;

    if (params.get('urlElastic') != null) {
      this.urlElastic = decodeURIComponent(params.get('urlElastic'));
      autoSearch = true;
    }

    if (params.get('clusterName') != null) {
      this.clusterName = decodeURIComponent(params.get('clusterName'));
      autoSearch = true;
    }

    if (params.get('indexName') != null) {
      this.indexName = decodeURIComponent(params.get('indexName'));
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
      let dates = decodeURIComponent(params.get('from')).split("T");
      let fromDate = dates[0].split("-");
      let fromHour = dates[1].split(":");
      this.defaultFrom = new Date(Date.UTC(fromDate[0], (fromDate[1] - 1), fromDate[2], fromHour[0], fromHour[1], fromHour[2]));
    }

    if (params.get('to') != null) {
      autoSearch = true;
      let dates = decodeURIComponent(params.get('to')).split("T");
      let fromDate = dates[0].split("-");
      let fromHour = dates[1].split(":");
      this.defaultTo = new Date(Date.UTC(fromDate[0], (fromDate[1] - 1), fromDate[2], fromHour[0], fromHour[1], fromHour[2]));
    }

    if (autoSearch) {
      this.search(dateToInputLiteral(this.defaultFrom), dateToInputLiteral(this.defaultTo));
    }

    let url = this.urlElastic + "_mapping";
    this.updateIndices(url);
  }

  private indices = [];
  private clusterSelected;

  private defaultFrom = new Date(new Date().valueOf() - (10 * 60 * 60 * 1000));
  private defaultTo = new Date(new Date().valueOf() - (1 * 60 * 60 * 1000));
  private guiquery:string;

  // show/hide the grid and spinner
  private rowData:any[] = [];
  private showGrid:boolean;
  private showError:boolean;
  private waiting:boolean = false;

  errorMsg:string = "";

  testType:boolean = true;
  clusterType:boolean = true;
  kmsType:boolean = true;

  debugLevel:boolean = true;
  infoLevel:boolean = true;
  warnLevel:boolean = true;
  errorLevel:boolean = true;

  useTail:boolean = false;

  urlElastic:string = 'http://localhost:9200/';
  clusterName:string;
  indexName:string;
  loggers:string;
  hosts:string;
  message:string;
  thread:string;
  maxResults:number = 500;
  urlCopied:string;
  showLoadMore:boolean = false;
  showPauseTail:boolean = false;
  showClearData:boolean = false;
  tailInterval;


  private updateIndices(url:string) {
    this.indices = [];
    this._elasticSearchService.getIndices(url).subscribe(
      data => {
        Object.keys(data).sort().map(e => {

            if (e.split('-').length == 3) {
              let cluster:string = e.split('-')[1];
              let date:string = e.split('-')[2];
              let elementExist = this.indices.filter(function (e) {
                return e.cluster.name == cluster
              });

              if (elementExist.length == 0) {

                let element = {
                  "cluster": {
                    "name": cluster,
                    "dates": {
                      "init": date,
                      "end": date
                    }
                  }
                };
                this.indices.push(element)
              } else {
                elementExist[0].cluster.dates.end = date;
              }
            }
          }
        )
        let elementEmpty = {
          "cluster": {
            "name": '----',
            "dates": {
              "init": '',
              "end": ''
            }
          }
        };
        this.indices.push(elementEmpty);
        this.indices.sort();
      },
      err => {

      }
    )
  }

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
      queryes.indices.query.filtered.filter.bool.must.push({
        //queryes.filtered.filter.bool.must.push({
        "terms": filter
      })
    } else if (values.length == 1) {
      if (field == "message") {
        let filterValue = "{\"multi_match\": {\"query\" : \"" + values.join(" ") + "\",\"type\": \"phrase\", \"fields\": [\"message\", \"logmessage\"] }}";
        queryes.indices.query.filtered.filter.bool.must.push(JSON.parse(filterValue));
      } else {
        filter[field] = values[0];
        let filterValue = "{\"match\":{\"" + field + "\" : {\"query\" : \"" + values.join(" ") + "\",\"type\": \"phrase\" }}}";
        //queryes.filtered.filter.bool.must.push(JSON.parse(filterValue));
        queryes.indices.query.filtered.filter.bool.must.push(JSON.parse(filterValue));
      }
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

    if (this.clusterName != undefined) {
      this.urlCopied += 'clusterName=' + encodeURIComponent(this.clusterName) + '&';
    }

    if (this.indexName != undefined) {
      this.urlCopied += 'indexName=' + encodeURIComponent(this.indexName) + '&';
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

  updateclusterSelected(event:Event):void {
    const value:string = (<HTMLSelectElement>event.srcElement).value;
    if (value !== '----') {
      let cluster = this.indices.filter(function (e) {
        return e.cluster.name == value
      });

      this.defaultFrom = new Date(Date.UTC(cluster[0].cluster.dates.init.split('.')[0], (cluster[0].cluster.dates.init.split('.')[1] - 1), cluster[0].cluster.dates.init.split('.')[2], 0, 0, 0));
      this.defaultTo = new Date(Date.parse(cluster[0].cluster.dates.end) + (23 * 60 * 60 * 1000) + (59 * 60 * 1000) + 59 * 1000);

      this.clusterSelected = value;
      this.clusterName = value;
    } else {
      this.clusterName = "";
    }
  }

  updateUrlElastic(event:Event):void {
    var value:string;
    if (event == undefined) {
      value = this.urlElastic;
    } else {
      value = (<HTMLSelectElement>event.srcElement).value;
    }
    this.clusterName = "";
    this.updateIndices(value + "_mapping");
  }

  getDefaultFromValue() {
    return dateToInputLiteral(this.defaultFrom);
  }

  getDefaultToValue() {
    return dateToInputLiteral(this.defaultTo);
  }

  getDifferenceDates(from:string, to:string):number {
    let date1:string[] = to.split('T')[0].split('-');
    let date2:string[] = from.split('T')[0].split('-');

    let date1_:Date = new Date(date1);
    let date2_:Date = new Date(date2);

    var date1Unixtime:number = parseInt(date1_.getTime() / 1000);
    var date2Unixtime:number = parseInt(date2_.getTime() / 1000);

    var timeDifference = date2Unixtime - date1Unixtime;

    var timeDifferenceInDays = Math.abs(timeDifference / 60 / 60 / 24);

    return timeDifferenceInDays;
  }

  tailSearch(tail:boolean) {
    this.useTail = tail;
    if (tail) {
      this.tailInterval = setInterval(() => {
        // In this case, to will be 'now'
        this.search(dateToInputLiteral(this.defaultFrom), undefined, true);
      }, 1000);
    } else {
      clearInterval(this.tailInterval);
      this.tailInterval = undefined;
    }
  }

  setUseTail(tail:boolean) {
    this.useTail = tail;
  }

  updateDatesForMoreDate(event) {
    this.dataForAdding = event;
  }

  updateRows(event) {
    this.rowData = event;
  }

  clearData() {
    this.rowData = [];
    clearInterval(this.tailInterval);
    this.tailInterval = undefined;
    this.showGrid = false;
    this.showLoadMore = false;
    this.showPauseTail = false;
    this.showClearData = false;
    this._scroll_id = "";
  }

  addMore() {
    let position = this.dataForAdding.position;
    let from = this.dataForAdding.initDate;
    let to = this.dataForAdding.endDate;
    if (to == undefined) {
      to = new Date(new Date().valueOf() - (1 * 60 * 60 * 1000));
    }
    this.search(from, to, true, position + 1)
  }


  search(from:string, to:string, append:boolean = false, position:number = -1) {
    this.generateCopyUrl(from, to);
    if (!append) {
      this.showGrid = false;
      this.waiting = true;
      this.rowData = [];
    }
    this.showError = false;
    this.showClearData = true;
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

    // Use clusterName
    if (this.clusterName == undefined || this.clusterName == '') {
      this.clusterName = "*";
    }

    let queryfrom:any;
    let queryto:any;
    let sort:'asc' | 'desc';

    queryfrom = from;
    if (!this.useTail) {
      queryto = to;
      sort = 'asc';
      this.showLoadMore = true;
      this.showPauseTail = false;
      if (this.tailInterval) {
        clearInterval(this.tailInterval);
      }
      this.tailInterval = undefined;
    } else {
      queryto = 'now';
      queryfrom = dateToInputLiteral(new Date(new Date().valueOf() - (2 * 60 * 61 * 1000)));
      sort = 'asc';
      this.showLoadMore = false;
      this.showPauseTail = true;
      if (this.tailInterval == undefined) {
        this.tailSearch(true);
      }
    }

    /*let queryes:any = {
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
     }*/

//    let index = 'kurento-' + this.clusterName + '-' + from.split('T')[0].replace(/-/g, '.');

    let queryes:any = {
      "indices": {
        "indices": [],
        "query": {
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
        },
        "no_match_query": "none"
      }
    }

    let index_:string = "";

    if (this.indexName == undefined || this.indexName == "") {
      if (!this.useTail) {
        let today = dateToInputLiteral(new Date(new Date().valueOf()));
        let differenceFromAndToday = this.getDifferenceDates(from, today);
        let differenceTodayAndTo = this.getDifferenceDates(today, to);

        for (var i = differenceFromAndToday; i >= differenceTodayAndTo; i--) {
          let date = new Date()
          date.setDate(date.getDate() - i);
          index_ = 'kurento-' + this.clusterName + '-' + dateToInputLiteral(date).split('T')[0].replace(/-/g, '.');
          queryes.indices.indices.push(index_);

          /*if (i == 0) {
           index_ += 'kurento-' + this.clusterName + '-{now%2Fd}';
           } else {
           index_ += 'kurento-' + this.clusterName + '-{now%2Fd-' + i + 'd}';
           if (i != differenceTodayAndTo) {
           index_ += ',';
           }
           }*/
        }
      } else {
        let today = dateToInputLiteral(new Date(new Date().valueOf()));
        index_ = 'kurento-' + this.clusterName + '-' + today.split('T')[0].replace(/-/g, '.');
        queryes.indices.indices.push(index_);
      }
    } else {
      index_ = this.indexName;
      queryes.indices.indices.push(index_);
    }

    // let url = this.urlElastic + index_ + '/_search?scroll=1m&filter_path=_scroll_id,hits.hits._source,hits.hits._type';
    let url = this.urlElastic + '_search?scroll=1m&filter_path=_scroll_id,hits.hits._source,hits.hits._type,hits';

    console.log("URL:", url);

    // Create index

    /*    let queryes:any = {
     "indices": {
     "indices": [index_],
     "query": {
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
     },
     "no_match_query": "none"
     }
     }*/

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

    console.log("Query: ", JSON.stringify(queryes));
    console.log('-----------------------------------------------------------------');

    let esquery = {
      sort: [
        {'@timestamp': sort}
      ],
      query: queryes,
      size: this.maxResults,
      highlight: {
        pre_tags: ["<b><i>"],
        post_tags: ["</i></b>"],
        fields: {
          message: {},
          host: {},
          threadid: {},
          loggername: {},
          loglevel: {},
          logmessage: {}
        }
      },
      _source: ['host', 'threadid', 'loggername', 'message', 'loglevel', 'logmessage', '@timestamp']
    };

    if (!append) {
      this.rowData = [];
    }

    if (append && position == -1) {
      if (!this.noMore) {
        if (this.rowData.length > 0) {
          url = this.urlElastic + "/_search/scroll"
          esquery = {scroll: '1m', scroll_id: this._scroll_id};
        }
      } else {
        esquery.query.indices.query.filtered.filter.bool.must[0].range['@timestamp'].gte = this.rowData[this.rowData.length - 1].time;
      }
    }

    this._elasticSearchService.internalSearch(url, esquery, this.maxResults, append).subscribe(
      data => {

        console.log("Data:", data);

        this._scroll_id = data._scroll_id;

        if (data.hits !== undefined && data.hits.hits.length === 0 && this.rowData.length == 0) {
          console.log("Returned response without results. Aborting");
          this.rowData = []
          this.rowData = this.rowData.slice();
          this.showGrid = true;
          this.waiting = false;
          return
        }

        let initPosition:number = -1;
        let endPosition:number = -1;

        if (data.hits) {
          console.log("Data hits size:", data.hits.hits.length)
          let prevSize:number = position;
          if (position == -1) {
            prevSize = this.rowData.length;
          }
          if (data.hits.hits.length === 0)
            this.noMore = true;
          else
            this.noMore = false;


          if (position != -1) {
            initPosition = position;
            position --;
            console.log("Init:", initPosition)
          }

          for (let logEntry of data.hits.hits) {
            let urlCode = getGerritUrl(logEntry._source.loggername, 1)
            let type = logEntry._type;
            let time = logEntry._source['@timestamp'];
            let message = ""

            if (logEntry.highlight.logmessage != undefined || logEntry.highlight.message != undefined) {
              if (type == 'cluster' || type == 'kms') {
                for (let i=0; i<logEntry.highlight.logmessage.length; i++){
                  message = message.concat(logEntry.highlight.logmessage[i]);
                }
              }else {
                for (let i=0; i<logEntry.highlight.message.length; i++) {
                  message = message.concat(logEntry.highlight.message[i]);
                }
              }
              //message = type == 'cluster' || type == 'kms' ? logEntry.highlight.logmessage[0] : logEntry.highlight.message[0];
            } else {
              message = type == 'cluster' || type == 'kms' ? logEntry._source.logmessage : logEntry._source.message;
            }
            let level = logEntry._source.loglevel;
            let thread = logEntry._source.threadid;
            if (logEntry.highlight.threadid != undefined) {
              thread = logEntry.highlight.threadid[0];
            }
            let logger = logEntry._source.loggername;
            if (logEntry.highlight.loggername != undefined) {
              logger = logEntry.highlight.loggername[0];
            }

            let host = logEntry._source.host;
            if (logEntry.highlight.host != undefined) {
              host = logEntry.highlight.host[0];
            }

            let logValue = {urlCode, type, time, message, level, thread, logger, host};

            if (append) {
              if (position != -1) {
                //console.log("this.rowData", this.rowData[position], position)
                while (this.rowData[position].message.indexOf("Sub-Search") > -1) {
                  position++;
                }
                let positionMessage = this.rowData[position].message.replace("<b><i>", "").replace("</i></b>", "");
                //console.log("---->", position, ";", logValue.time,";", message)
                if (this.rowData[position] != undefined && ((this.rowData[position].time === logValue.time && positionMessage === message.replace("<b><i>", "").replace("</i></b>", "")))) {
                  position++;
                  continue
                }
                this.rowData.splice(position, 0, logValue)
                position++;
              } else {
                if (prevSize == 0) {
                  this.rowData.push(logValue);
                } else {
                  let prevMessage = this.rowData[prevSize - 1].message.replace("<b><i>", "").replace("</i></b>", "");
                 if (this.rowData[prevSize - 1].time === logValue.time && prevMessage === message.replace("<b><i>", "").replace("</i></b>", "")) {
                    continue
                  }
                  this.rowData.push(logValue);
                }
              }
            } else {
              this.rowData.push(logValue);
            }
          }
          if (position != -1) {
            console.log("Position:", position, initPosition, position - initPosition)
            if (position - initPosition == 1) {
              endPosition = position;
            } else {
              endPosition = position + 1;
            }
            let urlCode = "";
            let type = "";
            let time = "";
            let random = Math.floor((Math.random() * 10000) + 1);
            let message = "Init Sub-Search: " + random;
            let level = "";
            let thread = "REMOVE";
            let logger = "";
            let host = "";

            let logValue = {urlCode, type, time, message, level, thread, logger, host};
            this.rowData.splice(initPosition, 0, logValue)
            message = "End Sub-Search: " + random;
            thread = "";
            logValue = {urlCode, type, time, message, level, thread, logger, host};
            this.rowData.splice(endPosition, 0, logValue)
          }
          if (data.hits.hits.length > 0) {
            this.rowData = this.rowData.slice();
            /*this.rowData =  this.rowData.filter(function(item, pos, self) {
              console.log(self, ";", pos, ";", item, self.indexOf(item) == pos)
              return self.indexOf(item) == pos;
            }).slice()*/

          /*  function uniqBy(a, key) {
              var seen = {};
              return a.filter(function(item) {
                var i = JSON.parse(JSON.stringify(item));
                i.message = i.message.replace("<b><i>", "").replace("</i></b>", "")
                var k = key(i);
                console.log(item.message,";", i, ";", seen, ";", k, seen.hasOwnProperty(k))
                return seen.hasOwnProperty(k) ? false : (seen[k] = true);
              })
            }

            let rowDataAux = uniqBy(this.rowData, JSON.stringify)
            this.rowData = rowDataAux.slice()*/
           /* this.rowData =  this.rowData.sort(function(a,b){

              let dates = decodeURIComponent(a.time).split("T");
              let fromDate = dates[0].split("-");
              let fromHour = dates[1].split(":");
              let defaultFrom = new Date(Date.UTC(fromDate[0], (fromDate[1] - 1), fromDate[2], fromHour[0], fromHour[1], fromHour[2]));
               dates = decodeURIComponent(b.time).split("T");
               fromDate = dates[0].split("-");
               fromHour = dates[1].split(":");
              let to = new Date(Date.UTC(fromDate[0], (fromDate[1] - 1), fromDate[2], fromHour[0], fromHour[1], fromHour[2]));
              console.log("Sort:", defaultFrom.getTime(), to.getTime() )
              return defaultFrom.getTime() < to.getTime();
            }).reduce(function(a, b){ console.log(a, b); if (b != a[0]) a.unshift(b); return a }, [])
            this.rowData = this.rowData.slice()*/
          }
        }

        this.showGrid = true;
        this.waiting = false;
      },
      err => {
        console.log('Error', err);
        this.errorMsg = err._body;
        this.showError = true;
        this.waiting = false;
        this.clearData();
      }
    )
  }

}
/**
 * Created by rbenitez on 14/4/16.
 */
