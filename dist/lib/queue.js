"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Queue {
    constructor() {
        this._isRunning = false;
        this._queue = [];
    }
    putOnQueue(fcn) {
        const p = new Promise((resolve, reject) => {
            this._queue.push({
                fcn, resolve, reject
            });
            setTimeout(() => {
                this.checkQueue();
            }, 0);
        });
        return p;
    }
    checkQueue() {
        if (!this._isRunning) {
            const nextOnQueue = this._queue.shift();
            if (nextOnQueue) {
                this._isRunning = true;
                try {
                    nextOnQueue.fcn()
                        .then((result) => {
                        nextOnQueue.resolve(result);
                        this._isRunning = false;
                        this.checkQueue();
                    }, (error) => {
                        nextOnQueue.reject(error);
                        this._isRunning = false;
                        this.checkQueue();
                    });
                }
                catch (error) {
                    nextOnQueue.reject(error);
                    this._isRunning = false;
                    this.checkQueue();
                }
            }
        }
    }
}
exports.Queue = Queue;
//# sourceMappingURL=queue.js.map