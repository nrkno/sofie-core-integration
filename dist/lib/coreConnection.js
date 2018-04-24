"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const _ = require("underscore");
const ddpConnector_1 = require("./ddpConnector");
const corePeripherals_1 = require("./corePeripherals");
const Random = require('ddp-random');
const DataStore = require('data-store');
var DeviceType;
(function (DeviceType) {
    DeviceType[DeviceType["MOSDEVICE"] = 0] = "MOSDEVICE";
    DeviceType[DeviceType["PLAYOUT"] = 1] = "PLAYOUT";
})(DeviceType = exports.DeviceType || (exports.DeviceType = {}));
class CoreConnection extends events_1.EventEmitter {
    constructor(coreOptions) {
        super();
        this._parent = null;
        this._children = [];
        this._sentConnectionId = '';
        this._coreOptions = coreOptions;
    }
    static getCredentials(name) {
        let store = DataStore(name);
        let credentials = store.get('CoreCredentials');
        if (!credentials) {
            credentials = CoreConnection.generateCredentials();
            store.set('CoreCredentials', credentials);
        }
        return credentials;
    }
    static deleteCredentials(name) {
        let store = DataStore(name);
        store.set('CoreCredentials', null);
    }
    static generateCredentials() {
        return {
            deviceId: Random.id(),
            deviceToken: Random.id()
        };
    }
    init(ddpOptionsORParent) {
        if (ddpOptionsORParent instanceof CoreConnection) {
            this._setParent(ddpOptionsORParent);
            return Promise.resolve()
                .then(() => {
                return this._sendInit();
            });
        }
        else {
            let ddpOptions = ddpOptionsORParent || {
                host: '127.0.0.1',
                port: 3000
            };
            ddpOptions.autoReconnect = true;
            ddpOptions.autoReconnectTimer = 1000;
            return new Promise((resolve) => {
                this._ddp = new ddpConnector_1.DDPConnector(ddpOptions);
                this._ddp.on('error', (err) => {
                    this.emit('error', err);
                });
                this._ddp.on('failed', (err) => {
                    this.emit('failed', err);
                });
                this._ddp.on('connectionChanged', (connected) => {
                    this.emit('connectionChanged', connected);
                    this._maybeSendInit()
                        .catch((err) => {
                        this.emit('error', err);
                    });
                });
                this._ddp.on('connected', () => {
                    this.emit('connected');
                });
                this._ddp.on('disconnected', () => {
                    this.emit('disconnected');
                });
                this._ddp.createClient();
                resolve();
            }).then(() => {
                return this._ddp.connect();
            }).then(() => {
                return this._sendInit();
            });
        }
    }
    destroy() {
        if (this._parent) {
            this._removeParent();
        }
        else {
            if (this._ddp) {
                this._ddp.close();
            }
        }
        return Promise.resolve();
    }
    addChild(child) {
        this._children.push(child);
    }
    removeChild(childToRemove) {
        let removeIndex = -1;
        this._children.forEach((c, i) => {
            if (c === childToRemove)
                removeIndex = i;
        });
        if (removeIndex !== -1) {
            this._children.splice(removeIndex, 1);
        }
    }
    onConnectionChanged(cb) {
        this.on('connectionChanged', cb);
    }
    onConnected(cb) {
        this.on('connected', cb);
    }
    onDisconnected(cb) {
        this.on('disconnected', cb);
    }
    onError(cb) {
        this.on('error', cb);
    }
    onFailed(cb) {
        this.on('failed', cb);
    }
    get ddp() {
        if (this._parent)
            return this._parent.ddp;
        else
            return this._ddp;
    }
    get connected() {
        return (this.ddp ? this.ddp.connected : false);
    }
    get deviceId() {
        return this._coreOptions.deviceId;
    }
    setStatus(status) {
        return new Promise((resolve, reject) => {
            this.ddp.ddpClient.call(corePeripherals_1.PeripheralDeviceAPI.methods.setStatus, [
                this._coreOptions.deviceId,
                this._coreOptions.deviceToken,
                status
            ], (err, returnedStatus) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(returnedStatus);
                }
            });
        });
    }
    callMethod(methodName, attrs) {
        return new Promise((resolve, reject) => {
            let fullAttrs = [
                this._coreOptions.deviceId,
                this._coreOptions.deviceToken
            ].concat(attrs || []);
            this.ddp.ddpClient.call(methodName, fullAttrs, (err, id) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(id);
                }
            });
        });
    }
    unInitialize() {
        return this.callMethod(corePeripherals_1.PeripheralDeviceAPI.methods.unInitialize);
    }
    mosManipulate(method, ...attrs) {
        return this.callMethod(method, attrs);
    }
    getPeripheralDevice() {
        return this.callMethod(corePeripherals_1.PeripheralDeviceAPI.methods.getPeripheralDevice);
    }
    getCollection(collectionName) {
        let collection = this.ddp.ddpClient.collections[collectionName] || {};
        let c = {
            find(selector) {
                if (_.isUndefined(selector)) {
                    return _.values(collection);
                }
                else if (_.isObject(selector)) {
                    return _.where(_.values(collection), selector);
                }
                else {
                    return [collection[selector]];
                }
            },
            findOne(selector) {
                return c.find(selector)[0];
            }
        };
        return c;
    }
    subscribe(publicationName, ...params) {
        return new Promise((resolve, reject) => {
            try {
                this.ddp.ddpClient.subscribe(publicationName, // name of Meteor Publish function to subscribe to
                params.concat([this._coreOptions.deviceToken]), // parameters used by the Publish function
                () => {
                    resolve();
                });
            }
            catch (e) {
                console.log(this.ddp.ddpClient);
                reject(e);
            }
        });
    }
    observe(collectionName) {
        return this.ddp.ddpClient.observe(collectionName);
    }
    _maybeSendInit() {
        // If the connectionId has changed, we should report that to Core:
        if (this.ddp && this.ddp.connectionId !== this._sentConnectionId) {
            return this._sendInit();
        }
        else {
            return Promise.resolve();
        }
    }
    _sendInit() {
        if (!this.ddp)
            throw Error('Not connected to Core');
        let options = {
            type: this._coreOptions.deviceType,
            name: this._coreOptions.deviceName,
            connectionId: this.ddp.connectionId
        };
        this._sentConnectionId = options.connectionId;
        return new Promise((resolve, reject) => {
            this.ddp.ddpClient.call(corePeripherals_1.PeripheralDeviceAPI.methods.initialize, [
                this._coreOptions.deviceId,
                this._coreOptions.deviceToken,
                options
            ], (err, id) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(id);
                }
            });
        });
    }
    _removeParent() {
        if (this._parent)
            this._parent.removeChild(this);
        this._parent = null;
        this.emit('connectionChanged', false);
        this.emit('disconnected');
    }
    _setParent(parent) {
        this._parent = parent;
        parent.addChild(this);
        parent.on('connectionChanged', (connected) => { this.emit('connectionChanged', connected); });
        parent.on('connected', () => { this.emit('connected'); });
        parent.on('disconnected', () => { this.emit('disconnected'); });
        if (this.connected) {
            this.emit('connected');
        }
        else {
            this.emit('disconnected');
        }
        this.emit('connectionChanged', this.connected);
    }
}
exports.CoreConnection = CoreConnection;
//# sourceMappingURL=coreConnection.js.map