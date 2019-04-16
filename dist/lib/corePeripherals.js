"use strict";
/**
 * Note: This file contains a copy of the typings from meteor/lib/api/peripheralDevice.ts in Core
 */
Object.defineProperty(exports, "__esModule", { value: true });
var PeripheralDeviceAPI;
(function (PeripheralDeviceAPI) {
    let StatusCode;
    (function (StatusCode) {
        StatusCode[StatusCode["UNKNOWN"] = 0] = "UNKNOWN";
        StatusCode[StatusCode["GOOD"] = 1] = "GOOD";
        StatusCode[StatusCode["WARNING_MINOR"] = 2] = "WARNING_MINOR";
        StatusCode[StatusCode["WARNING_MAJOR"] = 3] = "WARNING_MAJOR";
        StatusCode[StatusCode["BAD"] = 4] = "BAD";
        StatusCode[StatusCode["FATAL"] = 5] = "FATAL"; // Operation affected, not possible to recover without manual interference
    })(StatusCode = PeripheralDeviceAPI.StatusCode || (PeripheralDeviceAPI.StatusCode = {}));
    let DeviceType;
    (function (DeviceType) {
        DeviceType[DeviceType["MOSDEVICE"] = 0] = "MOSDEVICE";
        DeviceType[DeviceType["PLAYOUT"] = 1] = "PLAYOUT";
        DeviceType[DeviceType["OTHER"] = 2] = "OTHER";
        DeviceType[DeviceType["MEDIA_MANAGER"] = 3] = "MEDIA_MANAGER";
        DeviceType[DeviceType["SPREADSHEET"] = 4] = "SPREADSHEET";
    })(DeviceType = PeripheralDeviceAPI.DeviceType || (PeripheralDeviceAPI.DeviceType = {}));
    let methods;
    (function (methods) {
        methods["functionReply"] = "peripheralDevice.functionReply";
        methods["testMethod"] = "peripheralDevice.testMethod";
        methods["setStatus"] = "peripheralDevice.status";
        methods["ping"] = "peripheralDevice.ping";
        methods["initialize"] = "peripheralDevice.initialize";
        methods["unInitialize"] = "peripheralDevice.unInitialize";
        methods["getPeripheralDevice"] = "peripheralDevice.getPeripheralDevice";
        methods["pingWithCommand"] = "peripheralDevice.pingWithCommand";
        methods["killProcess"] = "peripheralDevice.killProcess";
        methods["determineDiffTime"] = "systemTime.determineDiffTime";
        methods["getTimeDiff"] = "systemTime.getTimeDiff";
        methods["getTime"] = "systemTime.getTime";
        methods["timelineTriggerTime"] = "peripheralDevice.timeline.setTimelineTriggerTime";
        methods["segmentLinePlaybackStarted"] = "peripheralDevice.rundown.partPlaybackStarted";
        methods["segmentLinePlaybackStopped"] = "peripheralDevice.rundown.partPlaybackStopped";
        methods["segmentLineItemPlaybackStarted"] = "peripheralDevice.rundown.piecePlaybackStarted";
        methods["segmentLineItemPlaybackStopped"] = "peripheralDevice.rundown.piecePlaybackStopped";
        methods["mosRoCreate"] = "peripheralDevice.mos.roCreate";
        methods["mosRoReplace"] = "peripheralDevice.mos.roReplace";
        methods["mosRoDelete"] = "peripheralDevice.mos.roDelete";
        methods["mosRoDeleteForce"] = "peripheralDevice.mos.roDeleteForce";
        methods["mosRoMetadata"] = "peripheralDevice.mos.roMetadata";
        methods["mosRoStatus"] = "peripheralDevice.mos.roStatus";
        methods["mosRoStoryStatus"] = "peripheralDevice.mos.roStoryStatus";
        methods["mosRoItemStatus"] = "peripheralDevice.mos.roItemStatus";
        methods["mosRoStoryInsert"] = "peripheralDevice.mos.roStoryInsert";
        methods["mosRoStoryReplace"] = "peripheralDevice.mos.roStoryReplace";
        methods["mosRoStoryMove"] = "peripheralDevice.mos.roStoryMove";
        methods["mosRoStoryDelete"] = "peripheralDevice.mos.roStoryDelete";
        methods["mosRoStorySwap"] = "peripheralDevice.mos.roStorySwap";
        methods["mosRoItemInsert"] = "peripheralDevice.mos.roItemInsert";
        methods["mosRoItemReplace"] = "peripheralDevice.mos.roItemReplace";
        methods["mosRoItemMove"] = "peripheralDevice.mos.roItemMove";
        methods["mosRoItemDelete"] = "peripheralDevice.mos.RoItemDelete";
        methods["mosRoItemSwap"] = "peripheralDevice.mos.RoItemSwap";
        methods["mosRoReadyToAir"] = "peripheralDevice.mos.RoReadyToAir";
        methods["mosRoFullStory"] = "peripheralDevice.mos.RoFullStory";
        methods["dataRundownDelete"] = "peripheralDevice.rundown.rundownDelete";
        methods["dataRundownCreate"] = "peripheralDevice.rundown.rundownCreate";
        methods["dataRundownUpdate"] = "peripheralDevice.rundown.rundownUpdate";
        methods["dataSegmentDelete"] = "peripheralDevice.rundown.segmentDelete";
        methods["dataSegmentCreate"] = "peripheralDevice.rundown.segmentCreate";
        methods["dataSegmentUpdate"] = "peripheralDevice.rundown.segmentUpdate";
        methods["dataPieceDelete"] = "peripheralDevice.rundown.pieceDelete";
        methods["dataPieceCreate"] = "peripheralDevice.rundown.pieceCreate";
        methods["dataPieceUpdate"] = "peripheralDevice.rundown.pieceUpdate";
        methods["resyncRundown"] = "peripheralDevice.mos.roResync";
        methods["getMediaObjectRevisions"] = "peripheralDevice.mediaScanner.getMediaObjectRevisions";
        methods["updateMediaObject"] = "peripheralDevice.mediaScanner.updateMediaObject";
        methods["getMediaWorkFlowRevisions"] = "peripheralDevice.mediaManager.getMediaWorkFlowRevisions";
        methods["updateMediaWorkFlow"] = "peripheralDevice.mediaManager.updateMediaWorkFlow";
        methods["getMediaWorkFlowStepRevisions"] = "peripheralDevice.mediaManager.getMediaWorkFlowStepRevisions";
        methods["updateMediaWorkFlowStep"] = "peripheralDevice.mediaManager.updateMediaWorkFlowStep";
        methods["requestUserAuthToken"] = "peripheralDevice.spreadsheet.requestUserAuthToken";
        methods["storeAccessToken"] = "peripheralDevice.spreadsheet.storeAccessToken";
    })(methods = PeripheralDeviceAPI.methods || (PeripheralDeviceAPI.methods = {}));
})(PeripheralDeviceAPI = exports.PeripheralDeviceAPI || (exports.PeripheralDeviceAPI = {}));
//# sourceMappingURL=corePeripherals.js.map