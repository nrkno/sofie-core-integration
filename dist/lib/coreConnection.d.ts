/// <reference types="node" />
import { EventEmitter } from 'events';
import { DDPConnector, DDPConnectorOptions, Observer } from './ddpConnector';
import { PeripheralDeviceAPI as P } from './corePeripherals';
export declare enum DeviceType {
    MOSDEVICE = 0,
    PLAYOUT = 1,
}
export interface InitOptions {
    type: DeviceType;
    name: string;
    connectionId: string;
}
export interface CoreCredentials {
    deviceId: string;
    deviceToken: string;
}
export interface CoreOptions extends CoreCredentials {
    deviceType: DeviceType;
    deviceName: string;
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
    private _sentConnectionId;
    constructor(coreOptions: CoreOptions);
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
    readonly ddp: DDPConnector;
    readonly connected: boolean;
    readonly deviceId: string;
    setStatus(status: P.StatusObject): Promise<P.StatusObject>;
    callMethod(methodName: string, attrs?: Array<any>): Promise<any>;
    unInitialize(): Promise<string>;
    mosManipulate(method: string, ...attrs: Array<any>): Promise<any>;
    getPeripheralDevice(): Promise<any>;
    getCollection(collectionName: string): Collection;
    subscribe(publicationName: string, ...params: Array<any>): Promise<string>;
    unsubscribe(subscriptionId: string): void;
    observe(collectionName: string): Observer;
    private _maybeSendInit();
    private _sendInit();
    private _removeParent();
    private _setParent(parent);
}
