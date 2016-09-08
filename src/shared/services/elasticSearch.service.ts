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

import {
  Http,
  Response,
  HTTP_PROVIDERS,
  Headers,
  RequestOptions,
  RequestMethod,
  Request,
  URLSearchParams
} from 'angular2/http'
import {Injectable} from 'angular2/core';
import 'rxjs/Rx';

@Injectable()
export class ElasticSearchService {

  public rowData:any[] = [];
  tail:boolean = true;
  _scroll_id:string;

  constructor(public http:Http) {
    console.log('Task Service created.');
    this.rowData = [];
  }

  internalSearch(url:string, query:any, maxResults:number, append:boolean = false) {

    if (!append) {
      this.rowData = [];
    }

    if (append) {
      if (this.rowData.length > 0) {
        // console.log("Must:", query.query.filtered.filter.bool.must[0].range['@timestamp'].gte)
        console.log("Last Time:", this.rowData[this.rowData.length - 1].time)
        console.log("Scroll_id:", this._scroll_id)
        url = "http://localhost:9200/_search/scroll"
        query = {scroll: '1m', scroll_id: this._scroll_id}
        console.log("Url tail:", url)
        //query.query.filtered.filter.bool.must[0].range['@timestamp'].gte = this.rowData[this.rowData.length - 1].time;
      }
    }
    let requestoptions = new RequestOptions({
      method: RequestMethod.Post,
      url,
      body: JSON.stringify(query)
    })

    let body2 = JSON.stringify(query)

    console.log("Body2:", body2)

    return this.http.request(new Request(requestoptions))
      .map((res:Response) => {
        let data = res.json()
        console.log("Res:", res);
        console.log("Data:", data);

        this._scroll_id = data._scroll_id;

        if (data.hits !== undefined && data.hits.hits.length === 0 && this.rowData.length == 0) {
          console.log("Returned response without results. Aborting");
          return;
        }

        if (data.hits) {

          let prevSize = this.rowData.length;

          for (let logEntry of data.hits.hits) {
            let type = logEntry._type;
            let time = logEntry._source['@timestamp'];
            let message = type == 'cluster' || type == 'kms' ? logEntry._source.logmessage : logEntry._source.message;
            let level = logEntry._source.loglevel;
            let thread = logEntry._source.threadid;
            let logger = logEntry._source.loggername;
            let host = logEntry._source.host;

            let logValue = {type, time, message, level, thread, logger, host};

            if (append) {
              if (prevSize == 0) {
                this.rowData.push(logValue);
              } else {
                if (this.rowData[prevSize - 1].time === logValue.time) {
                  this.rowData = this.rowData.slice();
                  return this.rowData;
                }
                this.rowData.push(logValue);
              }
            } else {
              this.rowData.push(logValue);
            }
          }

          return this.rowData;
        }
        return this.rowData;

      }, (err:Response) => {
        console.error("Error:", err);
      });
  }
}
/**
 * Created by rbenitez on 19/4/16.
 */
