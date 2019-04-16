/// <reference types="node" />
import { EventEmitter } from 'events';
import { DDPConnector, DDPConnectorOptions, Observer } from './ddpConnector';
import { PeripheralDeviceAPI as P, PeripheralDeviceAPI } from './corePeripherals';
import { Queue } from './queue';
export interface InitOptions {
    type: P.DeviceType;
    name: string;
    connectionId: string;
    parentDeviceId?: string;
    versions?: {
        [libraryName: string]: string;
    };
}
export interface CoreCredentials {
    deviceId: string;
    deviceToken: string;
}
export interface CoreOptions extends CoreCredentials {
    deviceType: P.DeviceType;
    deviceName: string;
    versions?: {
        [libraryName: string]: string;
    };
    watchDog?: boolean;
}
export interface CollectionObj {
    _id: string;
    [key: string]: any;
}
export interface Collection {
    find: (selector: any) => Array<CollectionObj>;
    findOne: (selector: any) => CollectionObj;
}
export declare class CoreConnection extends EventEmitter {
    private _ddp;
    private _parent;
    private _children;
    private _coreOptions;
    private _timeSync;
    private _watchDog?;
    private _watchDogPingResponse;
    private _connected;
    private _autoSubscriptions;
    private _sentConnectionId;
    private _pingTimeout;
    private queuedMethodCalls;
    private _triggerDoQueueTimer;
    private _timeLastMethodCall;
    private _timeLastMethodReply;
    private _destroyed;
    _queues: {
        [queueName: string]: Queue;
    };
    constructor(coreOptions: CoreOptions);
    static getStore(name: string): any;
    static getCredentials(name: string): CoreCredentials;
    static deleteCredentials(name: string): void;
    static generateCredentials(): CoreCredentials;
    init(ddpOptionsORParent?: DDPConnectorOptions | CoreConnection): Promise<string>;
    destroy(): Promise<void>;
    addChild(child: CoreConnection): void;
    removeChild(childToRemove: CoreConnection): void;
    onConnectionChanged(cb: (connected: boolean) => void): void;
    onConnected(cb: () => void): void;
    onDisconnected(cb: () => void): void;
    onError(cb: (err: Error) => void): void;
    onFailed(cb: (err: Error) => void): void;
    onInfo(cb: (message: any) => void): void;
    readonly ddp: DDPConnector;
    readonly connected: boolean;
    readonly deviceId: string;
    setStatus(status: P.StatusObject): Promise<P.StatusObject>;
    callMethod(methodName: PeripheralDeviceAPI.methods | string, attrs?: Array<any>): Promise<any>;
    callMethodLowPrio(methodName: PeripheralDeviceAPI.methods | string, attrs?: Array<any>): Promise<any>;
    unInitialize(): Promise<string>;
    mosManipulate(method: string, ...attrs: Array<any>): Promise<any>;
    getPeripheralDevice(): Promise<any>;
    getCollection(collectionName: string): Collection;
    subscribe(publicationName: string, ...params: Array<any>): Promise<string>;
    /**
     * Like a subscribe, but automatically renews it upon reconnection
     */
    autoSubscribe(publicationName: string, ...params: Array<any>): Promise<string>;
    unsubscribe(subscriptionId: string): void;
    observe(collectionName: string): Observer;
    getCurrentTime(): number;
    hasSyncedTime(): boolean;
    syncTimeQuality(): number | null;
    setPingResponse(message: string): void;
    putOnQueue<T>(queueName: string, fcn: () => Promise<T>): Promise<T>;
    private _emitError;
    private _setConnected;
    private _maybeSendInit;
    private _sendInit;
    private _removeParent;
    private _setParent;
    private _watchDogCheck;
    private _renewAutoSubscriptions;
    private _triggerPing;
    private _triggerDelayPing;
    private _ping;
    private _triggerDoQueue;
    private _doQueue;
    private _updateMaxListeners;
}
