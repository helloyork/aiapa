import ProxyChain from "proxy-chain";

// import { loadFileSync } from "./dat.js";
// import { App } from "../cli.js";
import { randomInt } from "../utils.js";

// const proxies = JSON.parse(loadFileSync(App.getFilePath("./dat/proxies.json")));

export class Server {
    constructor (app) {
        this.app = app;
    }

    proxyList = [];
    get proxies () {
        return this.proxyList;
    }

    addProxis (proxies) {
        this.proxyList = Array.from(new Set([...this.proxyList, ...proxies]));
        return this;
    }

    init (port = 8080) {
        this.port = port;
        this.proxy = new ProxyChain.Server({
            port: this.port,
            prepareRequestFunction: () => {
                if (Server.proxies.length === 0) {
                    throw new Error("No proxy is available");
                }
                return {
                    upstreamProxyUrl: `http://${this.proxies[randomInt(0, this.proxies.length)]}`
                };
            }
        });
        this.proxy.listen(() => {
            this.app.Logger.info("Proxy server listening on port " + this.port);
        });
        return this;
    }

    async close () {
        if (!this.proxy) return;
        await this.proxy?.close();
        this.app.Logger.info("Proxy server closed");
    }
}
