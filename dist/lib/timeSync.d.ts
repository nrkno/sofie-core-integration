export interface TimeSyncOptions {
    syncPeriod: number;
    minSyncQuality: number;
    minTryCount: number;
    maxTryCount: number;
    retryWaitTime: number;
    serverDelayTime: number;
}
export interface TimeSyncOptionsOptional {
    syncPeriod?: number;
    minSyncQuality?: number;
    minTryCount?: number;
    maxTryCount?: number;
    retryWaitTime?: number;
    serverDelayTime?: number;
}
export declare class TimeSync {
    private _options;
    private _invalidationCallback?;
    private _timeSource;
    private _syncDiff;
    private _syncQuality;
    private _lastSyncTime;
    constructor(options: TimeSyncOptionsOptional, timeSource: () => Promise<number>, invalidationCallback?: () => void);
    localTime(): number;
    currentTime(): number;
    readonly quality: number | null;
    readonly diff: number;
    isGood(): boolean;
    init(): Promise<boolean>;
    maybeTriggerSync(): void;
    private syncTime;
}
