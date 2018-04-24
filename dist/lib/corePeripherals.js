"use strict";
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
    })(DeviceType = PeripheralDeviceAPI.DeviceType || (PeripheralDeviceAPI.DeviceType = {}));
    let methods;
    (function (methods) {
        methods["setStatus"] = "peripheralDevice.status";
        methods["initialize"] = "peripheralDevice.initialize";
        methods["unInitialize"] = "peripheralDevice.unInitialize";
        methods["getPeripheralDevice"] = "peripheralDevice.getPeripheralDevice";
        methods["mosRoCreate"] = "peripheralDevice.mos.roCreate";
        methods["mosRoReplace"] = "peripheralDevice.mos.roReplace";
        methods["mosRoDelete"] = "peripheralDevice.mos.roDelete";
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
    })(methods = PeripheralDeviceAPI.methods || (PeripheralDeviceAPI.methods = {}));
})(PeripheralDeviceAPI = exports.PeripheralDeviceAPI || (exports.PeripheralDeviceAPI = {}));
//# sourceMappingURL=corePeripherals.js.map