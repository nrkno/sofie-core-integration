export declare namespace PeripheralDeviceAPI {
    enum StatusCode {
        UNKNOWN = 0,
        GOOD = 1,
        WARNING_MINOR = 2,
        WARNING_MAJOR = 3,
        BAD = 4,
        FATAL = 5,
    }
    interface StatusObject {
        statusCode: StatusCode;
        messages?: Array<string>;
    }
    enum DeviceType {
        MOSDEVICE = 0,
        PLAYOUT = 1,
        OTHER = 2,
    }
    interface InitOptions {
        type: DeviceType;
        name: string;
    }
    enum methods {
        'functionReply' = "peripheralDevice.functionReply",
        'setStatus' = "peripheralDevice.status",
        'initialize' = "peripheralDevice.initialize",
        'unInitialize' = "peripheralDevice.unInitialize",
        'getPeripheralDevice' = "peripheralDevice.getPeripheralDevice",
        'timelineTriggerTime' = "peripheralDevice.timeline.setTimelineTriggerTime",
        'segmentLinePlaybackStarted' = "peripheralDevice.runningOrder.segmentLinePlaybackStarted",
        'mosRoCreate' = "peripheralDevice.mos.roCreate",
        'mosRoReplace' = "peripheralDevice.mos.roReplace",
        'mosRoDelete' = "peripheralDevice.mos.roDelete",
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
    }
    type initialize = (id: string, token: string, options: InitOptions) => Promise<string>;
    type unInitialize = (id: string, token: string, status: StatusObject) => Promise<StatusObject>;
    type setStatus = (id: string, token: string, status: StatusObject) => Promise<StatusObject>;
}
