"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// const log = require('electron-log')
// const Request = require('request')
const _ = require("underscore");
class TimeSync {
    constructor(options, timeSource, invalidationCallback) {
        this._timeSource = timeSource;
        this._options = {
            syncPeriod: options.syncPeriod || (1000 * 60 * 10),
            minSyncQuality: options.minSyncQuality || (1000 / 50),
            minTryCount: options.minTryCount || 3,
            maxTryCount: options.maxTryCount || 10,
            retryWaitTime: options.retryWaitTime || 300,
            serverDelayTime: options.serverDelayTime || 0
        };
        this._syncDiff = 0;
        this._lastSyncTime = 0;
        this._syncQuality = null;
        this._invalidationCallback = invalidationCallback;
    }
    localTime() {
        return Date.now();
    }
    currentTime() {
        return this.localTime() + this._syncDiff;
    }
    get quality() {
        return this._syncQuality;
    }
    get diff() {
        return this._syncDiff;
    }
    isGood() {
        return !!(this.quality && this.quality < this._options.minSyncQuality);
    }
    init() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            setInterval(() => {
                this.maybeTriggerSync();
            }, this._options.syncPeriod / 2);
            return this.syncTime();
        });
    }
    maybeTriggerSync() {
        if (this.localTime() - this._lastSyncTime > this._options.syncPeriod) {
            // It's time to do a sync
            // log.verbose('triggerSync ' + (this.localTime() - this._lastSyncTime))
            this._lastSyncTime = this.localTime();
            setTimeout(() => {
                this.syncTime()
                    .catch((err) => {
                    console.log(err);
                });
            }, 1);
        }
    }
    syncTime() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let syncResults = [];
            let selectedSyncResult = null;
            let haveGoodSyncResult = false;
            let doSync = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                let startTime = this.localTime(); // Local time at the start of the query
                let serverTime = yield this._timeSource(); // Server time at some point during the query
                if (serverTime) {
                    let endTime = this.localTime(); // Local time at the end of the query
                    let transportDuration = endTime - startTime;
                    let calcLocalTime = startTime + (transportDuration / 2) + this._options.serverDelayTime; // Our best guess of the point in time the server probably calculated serverTime
                    let quality = transportDuration / 2; // The estimated quality of our estimate
                    let diff = serverTime - calcLocalTime;
                    return {
                        diff: diff,
                        quality: quality
                    };
                }
                return {
                    diff: 0,
                    quality: null
                };
            });
            for (let tryCount = 0; tryCount < this._options.maxTryCount; tryCount++) {
                let syncResult = yield doSync();
                if (!_.isNull(syncResult.quality)) {
                    syncResults.push(syncResult);
                }
                if (tryCount >= this._options.minTryCount) {
                    // Evaluate our progress:
                    // The best result is the one earliest in time, since the best quality is
                    // caused by the lowest delay:
                    let bestResult = _.min(syncResults, (r) => {
                        return (!_.isNull(r.quality) ? r.quality : 999999);
                    });
                    if (!bestResult)
                        bestResult = { diff: 0, quality: null };
                    if (!_.isNull(bestResult.quality) &&
                        bestResult.quality < this._options.minSyncQuality) {
                        // Our result is good enough
                        selectedSyncResult = bestResult;
                        haveGoodSyncResult = true;
                        break;
                    }
                }
            }
            if (!selectedSyncResult) {
                // We don't have a good sync result.
                let bestResult = _.min(syncResults, (r) => {
                    return (!_.isNull(r.quality) ? r.quality : 999999);
                });
                if (!_.isNull(bestResult.quality) &&
                    bestResult.quality < (this._syncQuality || 99990)) {
                    // It's not a good result, but it's better than what we currently have
                    selectedSyncResult = bestResult;
                }
            }
            if (selectedSyncResult) {
                // we've got a sync result
                this._syncDiff = selectedSyncResult.diff;
                this._syncQuality = selectedSyncResult.quality;
                this._lastSyncTime = this.localTime();
                if (this._invalidationCallback)
                    this._invalidationCallback();
                return haveGoodSyncResult;
            }
            else {
                // we never got a result that was good enough
                return false;
            }
        });
    }
}
exports.TimeSync = TimeSync;
//# sourceMappingURL=timeSync.js.map