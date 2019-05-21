import ITransport from "./transports/Transport";
let id = 1;

/*
** Naive Request Manager, only use 1st transport.
 * A more complex request manager could try each transport.
 * If a transport fails, or times out, move on to the next.
 */
class RequestManager {
  public transports: ITransport[];
  private requests: any;
  private connectPromise: Promise<any>;
  constructor(transports: ITransport[]) {
    this.transports = transports;
    this.requests = {};
    this.connectPromise = this.connect();
  }
  public connect(): Promise<any> {
    const promises = this.transports.map((transport) => {
      return new Promise(async (resolve, reject) => {
        await transport.connect();
        transport.onData((data: any) => {
          this.onData(data);
        });
        resolve();
      });
    });
    return Promise.all(promises);
  }
  public async request(method: string, params: any): Promise<any> {
    await this.connectPromise;
    return new Promise((resolve, reject) => {
      const i = id++;
      // naively grab first transport and use it
      const transport = this.transports[0];
      this.requests[i] = {
        resolve,
        reject,
      };
      transport.sendData(JSON.stringify({
        jsonrpc: "2.0",
        id: i,
        method,
        params,
      }));
    });
  }
  public close(): void {
    this.transports.forEach((transport) => {
      transport.close();
    });
  }
  private onData(data: string): void {
    const parsedData = JSON.parse(data);
    if (typeof parsedData.result === "undefined" && typeof parsedData.error === "undefined") {
      return;
    }
    const req = this.requests[parsedData.id];
    // call request callback for id
    if (req) {
      if (parsedData.error) {
        req.reject(new Error(
          [
            `code: ${parsedData.error.code}`,
            `message: ${parsedData.error.message}`,
            `data: ${JSON.stringify(parsedData.error.data)}`,
          ].join("\n"),
        ));
      } else {
        req.resolve(parsedData);
      }
      delete this.requests[parsedData.id];
    }
  }
}

export default RequestManager;
