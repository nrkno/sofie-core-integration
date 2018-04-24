"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let DDP = require('ddp');
const events_1 = require("events");
class DDPConnector extends events_1.EventEmitter {
    constructor(options) {
        super();
        this._connected = false;
        this._connecting = false;
        this.ddpIsOpen = false;
        this._monitorDDPConnectionInterval = null;
        this._options = options;
    }
    createClient() {
        let o = {
            host: this._options.host,
            port: this._options.port,
            path: this._options.path || '',
            ssl: this._options.ssl || false,
            useSockJS: true,
            autoReconnect: false,
            autoReconnectTimer: 1000,
            maintain_collections: true,
            ddpVersion: '1'
        };
        if (!this.ddpClient) {
            this.ddpClient = new DDP(o);
            this.ddpClient.on('socket-close', () => {
                this._onclientConnectionChange(false);
            });
            this.ddpClient.on('message', (message) => this._onClientMessage(message));
            this.ddpClient.on('socket-error', (error) => this._onClientError(error));
        }
        else {
            if (this.ddpClient.socket) {
                this.ddpClient.close();
            }
            this.ddpClient.host = o.host;
            this.ddpClient.port = o.port;
            this.ddpClient.path = o.path;
            this.ddpClient.ssl = o.ssl;
            this.ddpClient.useSockJS = o.useSockJS;
            this.ddpClient.autoReconnect = o.autoReconnect;
            this.ddpClient.autoReconnectTimer = o.autoReconnectTimer;
            this.ddpClient.ddpVersion = o.ddpVersion;
            this.ddpClient.connect();
        }
        this.ddpClient.on('connected', () => {
            this._onclientConnectionChange(true);
        });
        this.ddpClient.on('failed', (error) => this._onClientConnectionFailed(error));
    }
    connect() {
        return new Promise((resolve, reject) => {
            if (!this.ddpClient) {
                this.createClient();
            }
            if (this.ddpClient && !this._connecting) {
                this._connecting = true;
                this.ddpClient.connect((error /*, isReconnecting: boolean*/) => {
                    this._connecting = false;
                    if (error) {
                        reject(error);
                    }
                    else {
                        this._connected = true;
                        resolve();
                        this.ddpIsOpen = true;
                        this._monitorDDPConnection();
                    }
                });
            }
        });
    }
    close() {
        this.ddpIsOpen = false;
        if (this.ddpClient) {
            this.ddpClient.close();
            delete this.ddpClient;
        }
        this._onclientConnectionChange(false);
    }
    get connected() {
        return this._connected;
    }
    forceReconnect() {
        this.createClient();
    }
    get connectionId() {
        return this._connectionId;
    }
    _monitorDDPConnection() {
        if (this._monitorDDPConnectionInterval)
            clearInterval(this._monitorDDPConnectionInterval);
        this._monitorDDPConnectionInterval = setInterval(() => {
            if (this.ddpClient && !this.connected && this.ddpIsOpen && this._options.autoReconnect !== false) {
                // reconnect:
                this.ddpClient.connect();
            }
            else {
                // stop monitoring:
                if (this._monitorDDPConnectionInterval)
                    clearInterval(this._monitorDDPConnectionInterval);
            }
        }, this._options.autoReconnectTimer || 1000);
    }
    _onclientConnectionChange(connected) {
        if (connected !== this._connected) {
            this._connected = connected;
            if (connected) {
                this._connectionId = this.ddpClient.session;
            }
            // log.debug("DDP: _onclientConnectionChange "+connected);
            this.emit('connectionChanged', this._connected);
            if (this._connected)
                this.emit('connected');
            else
                this.emit('disconnected');
            if (!this._connected)
                this._monitorDDPConnection();
        }
    }
    _onClientConnectionFailed(error) {
        if (this.listenerCount('failed') > 0) {
            this.emit('failed', error);
        }
        else {
            console.log('Failed', error);
        }
        this._monitorDDPConnection();
    }
    _onClientMessage(message) {
        // message
        this.emit('message', message);
    }
    _onClientError(error) {
        this.emit('error', error);
        this._monitorDDPConnection();
    }
}
exports.DDPConnector = DDPConnector;
//# sourceMappingURL=ddpConnector.js.map