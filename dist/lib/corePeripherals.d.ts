/**
 * Note: This file contains a copy of the typings from meteor/lib/api/peripheralDevice.ts in Core
 */
export declare namespace PeripheralDeviceAPI {
    enum StatusCode {
        UNKNOWN = 0,
        GOOD = 1,
        WARNING_MINOR = 2,
        WARNING_MAJOR = 3,
        BAD = 4,
        FATAL = 5
    }
    interface StatusObject {
        statusCode: StatusCode;
        messages?: Array<string>;
    }
    enum DeviceType {
        MOSDEVICE = 0,
        PLAYOUT = 1,
        OTHER = 2,
        MEDIA_MANAGER = 3,
        SPREADSHEET = 4
    }
    interface InitOptions {
        type: DeviceType;
        name: string;
        connectionId: string;
        parentDeviceId?: string;
        versions?: {
            [libraryName: string]: string;
        };
    }
    type TimelineTriggerTimeResult = Array<{
        id: string;
        time: number;
    }>;
    interface PartPlaybackStartedResult {
        rundownId: string;
        partId: string;
        time: number;
    }
    type PartPlaybackStoppedResult = PartPlaybackStartedResult;
    interface PiecePlaybackStartedResult {
        rundownId: string;
        pieceId: string;
        time: number;
    }
    type PiecePlaybackStoppedResult = PiecePlaybackStartedResult;
    enum methods {
        'functionReply' = "peripheralDevice.functionReply",
        'testMethod' = "peripheralDevice.testMethod",
        'setStatus' = "peripheralDevice.status",
        'ping' = "peripheralDevice.ping",
        'initialize' = "peripheralDevice.initialize",
        'unInitialize' = "peripheralDevice.unInitialize",
        'getPeripheralDevice' = "peripheralDevice.getPeripheralDevice",
        'pingWithCommand' = "peripheralDevice.pingWithCommand",
        'killProcess' = "peripheralDevice.killProcess",
        'determineDiffTime' = "systemTime.determineDiffTime",
        'getTimeDiff' = "systemTime.getTimeDiff",
        'getTime' = "systemTime.getTime",
        'timelineTriggerTime' = "peripheralDevice.timeline.setTimelineTriggerTime",
        'partPlaybackStarted' = "peripheralDevice.rundown.partPlaybackStarted",
        'partPlaybackStopped' = "peripheralDevice.rundown.partPlaybackStopped",
        'piecePlaybackStarted' = "peripheralDevice.rundown.piecePlaybackStarted",
        'piecePlaybackStopped' = "peripheralDevice.rundown.piecePlaybackStopped",
        'mosRoCreate' = "peripheralDevice.mos.roCreate",
        'mosRoReplace' = "peripheralDevice.mos.roReplace",
        'mosRoDelete' = "peripheralDevice.mos.roDelete",
        'mosRoDeleteForce' = "peripheralDevice.mos.roDeleteForce",
        'mosRoMetadata' = "peripheralDevice.mos.roMetadata",
        'mosRoStatus' = "peripheralDevice.mos.roStatus",
        'mosRoStoryStatus' = "peripheralDevice.mos.roStoryStatus",
        'mosRoItemStatus' = "peripheralDevice.mos.roItemStatus",
        'mosRoStoryInsert' = "peripheralDevice.mos.roStoryInsert",
        'mosRoStoryReplace' = "peripheralDevice.mos.roStoryReplace",
        'mosRoStoryMove' = "peripheralDevice.mos.roStoryMove",
        'mosRoStoryDelete' = "peripheralDevice.mos.roStoryDelete",
        'mosRoStorySwap' = "peripheralDevice.mos.roStorySwap",
        'mosRoItemInsert' = "peripheralDevice.mos.roItemInsert",
        'mosRoItemReplace' = "peripheralDevice.mos.roItemReplace",
        'mosRoItemMove' = "peripheralDevice.mos.roItemMove",
        'mosRoItemDelete' = "peripheralDevice.mos.RoItemDelete",
        'mosRoItemSwap' = "peripheralDevice.mos.RoItemSwap",
        'mosRoReadyToAir' = "peripheralDevice.mos.RoReadyToAir",
        'mosRoFullStory' = "peripheralDevice.mos.RoFullStory",
        'dataRundownDelete' = "peripheralDevice.rundown.rundownDelete",
        'dataRundownCreate' = "peripheralDevice.rundown.rundownCreate",
        'dataRundownUpdate' = "peripheralDevice.rundown.rundownUpdate",
        'dataSegmentDelete' = "peripheralDevice.rundown.segmentDelete",
        'dataSegmentCreate' = "peripheralDevice.rundown.segmentCreate",
        'dataSegmentUpdate' = "peripheralDevice.rundown.segmentUpdate",
        'dataPieceDelete' = "peripheralDevice.rundown.pieceDelete",
        'dataPieceCreate' = "peripheralDevice.rundown.pieceCreate",
        'dataPieceUpdate' = "peripheralDevice.rundown.pieceUpdate",
        'resyncRundown' = "peripheralDevice.mos.roResync",
        'getMediaObjectRevisions' = "peripheralDevice.mediaScanner.getMediaObjectRevisions",
        'updateMediaObject' = "peripheralDevice.mediaScanner.updateMediaObject",
        'getMediaWorkFlowRevisions' = "peripheralDevice.mediaManager.getMediaWorkFlowRevisions",
        'updateMediaWorkFlow' = "peripheralDevice.mediaManager.updateMediaWorkFlow",
        'getMediaWorkFlowStepRevisions' = "peripheralDevice.mediaManager.getMediaWorkFlowStepRevisions",
        'updateMediaWorkFlowStep' = "peripheralDevice.mediaManager.updateMediaWorkFlowStep",
        'requestUserAuthToken' = "peripheralDevice.spreadsheet.requestUserAuthToken",
        'storeAccessToken' = "peripheralDevice.spreadsheet.storeAccessToken"
    }
    type initialize = (id: string, token: string, options: InitOptions) => Promise<string>;
    type unInitialize = (id: string, token: string, status: StatusObject) => Promise<StatusObject>;
    type setStatus = (id: string, token: string, status: StatusObject) => Promise<StatusObject>;
    type executeFunction = (deviceId: string, cb: (err: any, result: any) => void, functionName: string, ...args: any[]) => void;
}
