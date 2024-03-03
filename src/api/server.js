
import ProxyChain from "proxy-chain";
import { loadFileSync } from "./dat.js";
import { App } from "../cli.js";

import { randomInt } from "../utils.js";

const proxies = JSON.parse(loadFileSync(App.getFilePath("./dat/proxies.json")));

export class Server {
    static get proxies () {
        return proxies;
    }
    constructor(app){
        this.app = app;
    }
    init(port = 8080){
        this.port = port;
        this.proxy = new ProxyChain.Server({
            port: this.port,
            prepareRequestFunction: () =>{
                return {
                    upstreamProxyUrl: `http://${Server.proxies[randomInt(0, Server.proxies.length)]}`
                };
            }
        });
        this.proxy.listen(()=>{
            this.app.Logger.info("Proxy server listening on port " + this.port);
        });
        return this;
    }
}
