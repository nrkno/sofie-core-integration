/// <reference types="node" />
import { EventEmitter } from 'events';
export interface DDPConnectorOptions {
    host: string;
    port: number;
    path?: string;
    ssl?: boolean;
    debug?: boolean;
    autoReconnect?: boolean;
    autoReconnectTimer?: number;
    tlsOpts?: {
        ca?: Buffer[];
        key?: Buffer;
        cert?: Buffer;
        checkServerIdentity?: (hostname: string, cert: object) => Error | undefined;
    };
}
export interface Observer {
    added: (id: string) => void;
    changed: (id: string, oldFields: any, clearedFields: any, newFields: any) => void;
    removed: (id: string, oldValue: any) => void;
    stop: () => void;
}
export interface DDPClient {
    on: (event: string, data?: any) => void;
    close: () => void;
    connect: (callback?: (error: Error, wasReconnect: boolean) => void) => void;
    call: (methodName: string, data: Array<any>, callback: (err: Error, result: any) => void) => void;
    subscribe: (subscriptionName: string, data: Array<any>, callback: () => void) => string;
    unsubscribe: (subscriptionId: string) => void;
    observe: (collectionName: string) => Observer;
    collections: {
        [collectionName: string]: {
            [id: string]: {
                _id: string;
                [attr: string]: any;
            };
        };
    };
    socket: any;
    session: string;
    host: string;
    port: number;
    path: string;
    ssl: boolean;
    useSockJS: boolean;
    autoReconnect: boolean;
    autoReconnectTimer: number;
    ddpVersion: any;
}
export declare class DDPConnector extends EventEmitter {
    ddpClient: DDPClient;
    private _options;
    private _connected;
    private _connecting;
    private _connectionId;
    private ddpIsOpen;
    private _monitorDDPConnectionInterval;
    constructor(options: DDPConnectorOptions);
    createClient(): Promise<void>;
    connect(): Promise<void>;
    close(): void;
    readonly connected: boolean;
    forceReconnect(): Promise<void>;
    readonly connectionId: string;
    private _setupDDPEvents;
    private _monitorDDPConnection;
    private _onclientConnectionChange;
    private _onClientConnectionFailed;
    private _onClientMessage;
    private _onClientError;
    private _onClientInfo;
}
