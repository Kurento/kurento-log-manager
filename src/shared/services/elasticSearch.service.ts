import {Http, Response, HTTP_PROVIDERS, Headers, RequestOptions, RequestMethod, Request, URLSearchParams} from 'angular2/http'
import {Injectable} from 'angular2/core';
import 'rxjs/Rx';

@Injectable()
export class ElasticSearchService {

  public rowData:any[] = [];
  private headers;

  constructor(public http:Http) {
    console.log('Task Service created.');
  }

  internalSearch(url:string, query:any, maxResults:number, append:boolean = false) {

    let requestoptions = new RequestOptions({
      method: RequestMethod.Post,
      url,
      body: JSON.stringify(query)
    })

    let body2 = JSON.stringify(query)

    console.log("Body2:", body2)

    return this.http.request(new Request(requestoptions))
      .map((res: Response) => {


        let data = res.json()
        console.log("Res:", res);
        console.log("Data:", data);
        this.rowData = [];

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

          this.rowData = this.rowData.slice();
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
