"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const _ = require("underscore");
/**
 * Watchdog is used to make sure there is a working connection with Core.
 * Usage: in the function provided to addCheck, we should send a message to core
 * and resolve the returned promise when we've got a good reply.
 * If the Watchdog doesn't get it's checkFunctions resolved withing a certain time
 * it will forcefully quit the Node process (or emit the 'exit' event.
 */
class WatchDog extends events_1.EventEmitter {
    constructor(_timeout) {
        super();
        this._checkTimeout = null;
        this._dieTimeout = null;
        this._watching = false;
        this._checkFunctions = [];
        this.timeout = _timeout || 60 * 1000;
    }
    startWatching() {
        if (!this._watching) {
            this._watch();
        }
        this._watching = true;
    }
    stopWatching() {
        if (this._watching) {
            if (this._dieTimeout)
                clearTimeout(this._dieTimeout);
            if (this._checkTimeout)
                clearTimeout(this._checkTimeout);
        }
        this._watching = false;
    }
    addCheck(fcn) {
        this._checkFunctions.push(fcn);
    }
    removeCheck(fcn) {
        let i = this._checkFunctions.indexOf(fcn);
        if (i !== -1)
            this._checkFunctions.splice(i, 1);
    }
    _everythingIsOk() {
        if (this._watching) {
            this._watch();
        }
    }
    _watch() {
        if (this._dieTimeout)
            clearTimeout(this._dieTimeout);
        if (this._checkTimeout)
            clearTimeout(this._checkTimeout);
        this._checkTimeout = setTimeout(() => {
            Promise.all(_.map(this._checkFunctions, (fcn) => {
                return fcn();
            }))
                .then(() => {
                // console.log('all promises have resolved')
                // all promises have resolved
                this._everythingIsOk();
            })
                .catch(() => {
                // do nothing, the die-timeout will trigger soon
            });
            this._dieTimeout = setTimeout(() => {
                // This timeout SHOULD have been aborted by .everythingIsOk
                // but since it's not, it is our job to quit gracefully, triggering a reset
                if (this.listenerCount('message') > 0) {
                    this.emit('message', 'Watchdog: Quitting process!');
                }
                else {
                    console.log('Watchdog: Quitting!');
                }
                if (this.listenerCount('exit') > 0) {
                    this.emit('exit');
                }
                else {
                    process.exit(42);
                }
            }, 5000);
        }, this.timeout);
    }
}
exports.WatchDog = WatchDog;
//# sourceMappingURL=watchDog.js.map