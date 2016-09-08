import {Component} from 'angular2/core';
import {Http, Response, HTTP_PROVIDERS, Headers, RequestOptions, RequestMethod, Request} from 'angular2/http'
import {CORE_DIRECTIVES, FORM_DIRECTIVES} from 'angular2/common';
import {dateToInputLiteral, ES_URL, INDEX, RESULTS_PER_REQUEST} from './../../shared/utils/Utils';
import {ElasticSearchService} from './../../shared/services/elasticSearch.service';
import {GridComponent} from './../../grid/components/grid.component'

import 'ag-grid-enterprise/main';

@Component({
  selector: 'sd-search-advance',
  templateUrl: './searchAdvance/components/searchAdvance.component.html',
  styleUrls: ['./searchAdvance/components/searchAdvance.component.css'],
  providers: [HTTP_PROVIDERS, ElasticSearchService],
  directives: [FORM_DIRECTIVES, CORE_DIRECTIVES, GridComponent]
})

export class SearchAdvanceComponent {
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

  getDefaultFromValue() {
    return dateToInputLiteral(this.defaultFrom);
  }

  getDefaultToValue() {
    return dateToInputLiteral(this.defaultTo);
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

    let maxResults = 50;

    this._elasticSearchService.internalSearch(url, esquery, maxResults, append).subscribe(
     data => {
     console.log("Data:", data);
     this.rowData = data;
     this.showGrid = true;
     this.waiting = false;
     },
     err => console.log('Error', err)
     )
    /*this.showGrid = true;
    this.waiting = false;
    this.rowData = [{
      "host": "kms-room-ip-10-0-20-47",
      "level": "INFO",
      "logger": "org.kurento.kmscluster.controller.autoscaling.AWSAutoscalingService",
      "message": "Published load metric 0.0 to AWS CloudWathService",
      "thread": "Timer-0",
      "time": "2016-04-18T04:52:15.595Z",
      "type": "cluster"
    },{
      "host": "kms-room-ip-10-0-20-47",
      "level": "INFO",
      "logger": "org.kurento.kmscluster.controller.autoscaling.AWSAutoscalingService",
      "message": "Published load metric 0.0 to AWS CloudWathService",
      "thread": "Timer-0",
      "time": "2016-04-18T04:52:15.595Z",
      "type": "cluster"
    },{
      "host": "kms-room-ip-10-0-20-47",
      "level": "INFO",
      "logger": "org.kurento.kmscluster.controller.autoscaling.AWSAutoscalingService",
      "message": "Published load metric 0.0 to AWS CloudWathService",
      "thread": "Timer-0",
      "time": "2016-04-18T04:52:15.595Z",
      "type": "cluster"
    },{
      "host": "kms-room-ip-10-0-20-47",
      "level": "INFO",
      "logger": "org.kurento.kmscluster.controller.autoscaling.AWSAutoscalingService",
      "message": "Published load metric 0.0 to AWS CloudWathService",
      "thread": "Timer-0",
      "time": "2016-04-18T04:52:15.595Z",
      "type": "cluster"
    }];*/
  }

}
/**
 * Created by rbenitez on 14/4/16.
 */
