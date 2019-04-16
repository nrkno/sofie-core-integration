"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const _ = require("underscore");
const ddpConnector_1 = require("./ddpConnector");
const corePeripherals_1 = require("./corePeripherals");
const timeSync_1 = require("./timeSync");
const watchDog_1 = require("./watchDog");
const queue_1 = require("./queue");
const DataStore = require('data-store');
const Random = require('ddp-random');
// low-prio calls:
const TIMEOUTCALL = 200; // ms, time to wait after a call
const TIMEOUTREPLY = 50; // ms, time to wait after a reply
class CoreConnection extends events_1.EventEmitter {
    constructor(coreOptions) {
        super();
        this._parent = null;
        this._children = [];
        this._watchDogPingResponse = '';
        this._connected = false;
        this._autoSubscriptions = {};
        this._sentConnectionId = '';
        this._pingTimeout = null;
        this.queuedMethodCalls = [];
        this._triggerDoQueueTimer = null;
        this._timeLastMethodCall = 0;
        this._timeLastMethodReply = 0;
        this._destroyed = false;
        this._queues = {};
        this._coreOptions = coreOptions;
        if (this._coreOptions.watchDog) {
            this._watchDog = new watchDog_1.WatchDog();
            this._watchDog.on('message', msg => this._emitError('msg ' + msg));
            this._watchDog.startWatching();
        }
    }
    static getStore(name) {
        return new DataStore(name);
    }
    static getCredentials(name) {
        let store = CoreConnection.getStore(name);
        let credentials = store.get('CoreCredentials');
        if (!credentials) {
            credentials = CoreConnection.generateCredentials();
            store.set('CoreCredentials', credentials);
        }
        return credentials;
    }
    static deleteCredentials(name) {
        let store = CoreConnection.getStore(name);
        store.set('CoreCredentials', null);
    }
    static generateCredentials() {
        return {
            deviceId: Random.id(),
            deviceToken: Random.id()
        };
    }
    init(ddpOptionsORParent) {
        this._destroyed = false;
        this.on('connected', () => this._renewAutoSubscriptions());
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
            if (!_.has(ddpOptions, 'autoReconnect'))
                ddpOptions.autoReconnect = true;
            if (!_.has(ddpOptions, 'autoReconnectTimer'))
                ddpOptions.autoReconnectTimer = 1000;
            return new Promise((resolve) => {
                this._ddp = new ddpConnector_1.DDPConnector(ddpOptions);
                this._ddp.on('error', (err) => {
                    this._emitError('ddpError: ' + (_.isObject(err) && err.message) || err.toString());
                });
                this._ddp.on('failed', (err) => {
                    this.emit('failed', err);
                });
                this._ddp.on('info', (message) => {
                    this.emit('info', message);
                });
                this._ddp.on('connectionChanged', (connected) => {
                    this._setConnected(connected);
                    this._maybeSendInit()
                        .catch((err) => {
                        this._emitError('_maybesendInit ' + err);
                    });
                });
                this._ddp.on('connected', () => {
                    // this.emit('connected')
                    if (this._watchDog)
                        this._watchDog.addCheck(() => this._watchDogCheck());
                });
                this._ddp.on('disconnected', () => {
                    // this.emit('disconnected')
                    if (this._watchDog)
                        this._watchDog.removeCheck(() => this._watchDogCheck());
                });
                resolve();
            }).then(() => {
                return this._ddp.createClient();
            }).then(() => {
                return this._ddp.connect();
            }).then(() => {
                this._setConnected(this._ddp.connected); // ensure that connection status is synced
                return this._sendInit();
            }).then((deviceId) => {
                this._timeSync = new timeSync_1.TimeSync({
                    serverDelayTime: 0
                }, () => {
                    return this.callMethod(corePeripherals_1.PeripheralDeviceAPI.methods.getTimeDiff)
                        .then((stat) => {
                        return stat.currentTime;
                    });
                });
                return this._timeSync.init()
                    .then(() => {
                    this._triggerPing();
                })
                    .then(() => {
                    return deviceId;
                });
            });
        }
    }
    destroy() {
        this._destroyed = true;
        if (this._parent) {
            this._removeParent();
        }
        else {
            this._removeParent();
            if (this._ddp) {
                this._ddp.close();
            }
        }
        this.removeAllListeners('error');
        this.removeAllListeners('connectionChanged');
        this.removeAllListeners('connected');
        this.removeAllListeners('disconnected');
        this.removeAllListeners('failed');
        this.removeAllListeners('info');
        if (this._watchDog)
            this._watchDog.stopWatching();
        if (this._pingTimeout) {
            clearTimeout(this._pingTimeout);
            this._pingTimeout = null;
        }
        return Promise.all(_.map(this._children, (child) => {
            return child.destroy();
        })).then(() => {
            this._children = [];
            return Promise.resolve();
        });
    }
    addChild(child) {
        this._children.push(child);
        this._updateMaxListeners();
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
    onInfo(cb) {
        this.on('info', cb);
    }
    get ddp() {
        if (this._parent)
            return this._parent.ddp;
        else
            return this._ddp;
    }
    get connected() {
        return this._connected;
        // return (this.ddp ? this.ddp.connected : false)
    }
    get deviceId() {
        return this._coreOptions.deviceId;
    }
    setStatus(status) {
        return this.callMethod(corePeripherals_1.PeripheralDeviceAPI.methods.setStatus, [status]);
    }
    callMethod(methodName, attrs) {
        return new Promise((resolve, reject) => {
            if (this._destroyed) {
                reject('callMethod: CoreConnection has been destroyed');
                return;
            }
            if (!methodName) {
                reject('callMethod: argument missing: methodName');
                return;
            }
            let fullAttrs = [
                this._coreOptions.deviceId,
                this._coreOptions.deviceToken
            ].concat(attrs || []);
            this._timeLastMethodCall = Date.now();
            this.ddp.ddpClient.call(methodName, fullAttrs, (err, id) => {
                this._timeLastMethodReply = Date.now();
                if (err) {
                    reject(err);
                }
                else {
                    resolve(id);
                }
            });
        });
    }
    callMethodLowPrio(methodName, attrs) {
        return new Promise((resolve, reject) => {
            this.queuedMethodCalls.push({
                f: () => {
                    return this.callMethod(methodName, attrs);
                },
                resolve: resolve,
                reject: reject
            });
            this._triggerDoQueue();
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
                else if (_.isFunction(selector)) {
                    return _.filter(_.values(collection), selector);
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
                let subscriptionId = this.ddp.ddpClient.subscribe(publicationName, // name of Meteor Publish function to subscribe to
                params.concat([this._coreOptions.deviceToken]), // parameters used by the Publish function
                () => {
                    resolve(subscriptionId);
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }
    /**
     * Like a subscribe, but automatically renews it upon reconnection
     */
    autoSubscribe(publicationName, ...params) {
        return this.subscribe(publicationName, ...params)
            .then((subscriptionId) => {
            this._autoSubscriptions[subscriptionId] = {
                publicationName: publicationName,
                params: params
            };
            return subscriptionId;
        });
    }
    unsubscribe(subscriptionId) {
        this.ddp.ddpClient.unsubscribe(subscriptionId);
        delete this._autoSubscriptions[subscriptionId];
    }
    observe(collectionName) {
        return this.ddp.ddpClient.observe(collectionName);
    }
    getCurrentTime() {
        return this._timeSync.currentTime();
    }
    hasSyncedTime() {
        return this._timeSync.isGood();
    }
    syncTimeQuality() {
        return this._timeSync.quality;
    }
    setPingResponse(message) {
        this._watchDogPingResponse = message;
    }
    putOnQueue(queueName, fcn) {
        if (!this._queues[queueName]) {
            this._queues[queueName] = new queue_1.Queue();
        }
        return this._queues[queueName].putOnQueue(fcn);
    }
    _emitError(e) {
        if (!this._destroyed) {
            this.emit('error', e);
        }
        else {
            console.log('destroyed error', e);
        }
    }
    _setConnected(connected) {
        let prevConnected = this._connected;
        this._connected = connected;
        if (prevConnected !== connected) {
            if (connected)
                this.emit('connected');
            else
                this.emit('disconnected');
            this.emit('connectionChanged', connected);
            this._triggerPing();
        }
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
            connectionId: this.ddp.connectionId,
            parentDeviceId: (this._parent && this._parent.deviceId) || undefined,
            versions: this._coreOptions.versions
        };
        this._sentConnectionId = options.connectionId;
        return this.callMethod(corePeripherals_1.PeripheralDeviceAPI.methods.initialize, [options]);
    }
    _removeParent() {
        if (this._parent)
            this._parent.removeChild(this);
        this._parent = null;
        this._setConnected(false);
    }
    _setParent(parent) {
        this._parent = parent;
        parent.addChild(this);
        parent.on('connectionChanged', (connected) => { this._setConnected(connected); });
        this._setConnected(parent.connected);
    }
    _watchDogCheck() {
        /*
            Randomize a message and send it to Core.
            Core should then reply with triggering executeFunction with the "pingResponse" method.
        */
        let message = 'watchdogPing_' + Math.round(Math.random() * 100000);
        this.callMethod(corePeripherals_1.PeripheralDeviceAPI.methods.pingWithCommand, [message])
            .catch(e => this._emitError('watchdogPing' + e));
        return new Promise((resolve, reject) => {
            let i = 0;
            let checkPingReply = () => {
                if (this._watchDogPingResponse === message) {
                    // if we've got a good watchdog response, we can delay the pinging:
                    this._triggerDelayPing();
                    resolve();
                }
                else {
                    i++;
                    if (i > 50) {
                        reject();
                    }
                    else {
                        setTimeout(checkPingReply, 300);
                    }
                }
            };
            checkPingReply();
        }).then(() => {
            return;
        });
    }
    _renewAutoSubscriptions() {
        _.each(this._autoSubscriptions, (sub) => {
            this.subscribe(sub.publicationName, ...sub.params)
                .catch(e => this._emitError('renewSubscr ' + sub.publicationName + ': ' + e));
        });
    }
    _triggerPing() {
        if (!this._pingTimeout) {
            this._pingTimeout = setTimeout(() => {
                this._pingTimeout = null;
                this._ping();
            }, 90 * 1000);
        }
    }
    _triggerDelayPing() {
        // delay the ping:
        if (this._pingTimeout) {
            clearTimeout(this._pingTimeout);
            this._pingTimeout = null;
        }
        this._triggerPing();
    }
    _ping() {
        try {
            if (this.connected) {
                this.callMethod(corePeripherals_1.PeripheralDeviceAPI.methods.ping)
                    .catch(e => this._emitError('_ping' + e));
            }
        }
        catch (e) {
            this._emitError('_ping2 ' + e);
        }
        if (this.connected) {
            this._triggerPing();
        }
    }
    _triggerDoQueue(time = 2) {
        if (!this._triggerDoQueueTimer) {
            this._triggerDoQueueTimer = setTimeout(() => {
                this._triggerDoQueueTimer = null;
                this._doQueue();
            }, time);
        }
    }
    _doQueue() {
        // check if we can send a call?
        let timeSinceLastMethodCall = Date.now() - this._timeLastMethodCall;
        let timeSinceLastMethodReply = Date.now() - this._timeLastMethodReply;
        if (timeSinceLastMethodCall < TIMEOUTCALL) {
            // Not enough time has passed since last method call
            this._triggerDoQueue(TIMEOUTCALL - timeSinceLastMethodCall + 1);
        }
        else if (timeSinceLastMethodReply < TIMEOUTREPLY) {
            // Not enough time has passed since last method reply
            this._triggerDoQueue(TIMEOUTREPLY - timeSinceLastMethodReply + 1);
        }
        else {
            // yep, it's time to send a command!
            let c = this.queuedMethodCalls.shift();
            if (c) {
                c.f()
                    .then((result) => {
                    this._triggerDoQueue();
                    c.resolve(result);
                })
                    .catch((err) => {
                    this._triggerDoQueue();
                    c.reject(err);
                });
            }
        }
    }
    _updateMaxListeners() {
        this.setMaxListeners(10 +
            this._children.length * 10 // allow 10 listeners per child
        );
    }
}
exports.CoreConnection = CoreConnection;
//# sourceMappingURL=coreConnection.js.map