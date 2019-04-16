/// <reference types="node" />
import { EventEmitter } from 'events';
/**
 * Watchdog is used to make sure there is a working connection with Core.
 * Usage: in the function provided to addCheck, we should send a message to core
 * and resolve the returned promise when we've got a good reply.
 * If the Watchdog doesn't get it's checkFunctions resolved withing a certain time
 * it will forcefully quit the Node process (or emit the 'exit' event.
 */
export declare class WatchDog extends EventEmitter {
    timeout: number;
    private _checkTimeout;
    private _dieTimeout;
    private _watching;
    private _checkFunctions;
    constructor(_timeout?: number);
    startWatching(): void;
    stopWatching(): void;
    addCheck(fcn: () => Promise<any>): void;
    removeCheck(fcn: () => Promise<any>): void;
    private _everythingIsOk;
    private _watch;
}
