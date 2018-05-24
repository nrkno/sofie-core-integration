export namespace PeripheralDeviceAPI {

export enum StatusCode {

	UNKNOWN = 0, 		// Status unknown
	GOOD = 1, 			// All good and green
	WARNING_MINOR = 2,	// Everything is not OK, operation is not affected
	WARNING_MAJOR = 3, 	// Everything is not OK, operation might be affected
	BAD = 4, 			// Operation affected, possible to recover
	FATAL = 5			// Operation affected, not possible to recover without manual interference
}

export interface StatusObject {
	statusCode: StatusCode,
	messages?: Array<string>
}

export enum DeviceType {
	MOSDEVICE = 0,
	PLAYOUT = 1,
	OTHER = 2 // i.e. sub-devices
}
export interface InitOptions {
	type: DeviceType,
	name: string
}

export enum methods {
	'functionReply' 	= 'peripheralDevice.functionReply',

	'setStatus' 		= 'peripheralDevice.status',
	'initialize' 		= 'peripheralDevice.initialize',
	'unInitialize' 		= 'peripheralDevice.unInitialize',
	'getPeripheralDevice'= 'peripheralDevice.getPeripheralDevice',

	'determineDiffTime'		= 'systemTime.determineDiffTime',
	'getTimeDiff'			= 'systemTime.getTimeDiff',
	'getTime'				= 'systemTime.getTime',

	'timelineTriggerTime'			= 'peripheralDevice.timeline.setTimelineTriggerTime',
	'segmentLinePlaybackStarted' 	= 'peripheralDevice.runningOrder.segmentLinePlaybackStarted',

	'mosRoCreate' 		= 'peripheralDevice.mos.roCreate',
	'mosRoReplace' 		= 'peripheralDevice.mos.roReplace',
	'mosRoDelete' 		= 'peripheralDevice.mos.roDelete',
	'mosRoMetadata' 	= 'peripheralDevice.mos.roMetadata',
	'mosRoStatus' 		= 'peripheralDevice.mos.roStatus',
	'mosRoStoryStatus' 	= 'peripheralDevice.mos.roStoryStatus',
	'mosRoItemStatus' 	= 'peripheralDevice.mos.roItemStatus',
	'mosRoStoryInsert' 	= 'peripheralDevice.mos.roStoryInsert',
	'mosRoStoryReplace' = 'peripheralDevice.mos.roStoryReplace',
	'mosRoStoryMove' 	= 'peripheralDevice.mos.roStoryMove',
	'mosRoStoryDelete' 	= 'peripheralDevice.mos.roStoryDelete',
	'mosRoStorySwap' 	= 'peripheralDevice.mos.roStorySwap',
	'mosRoItemInsert' 	= 'peripheralDevice.mos.roItemInsert',
	'mosRoItemReplace' 	= 'peripheralDevice.mos.roItemReplace',
	'mosRoItemMove' 	= 'peripheralDevice.mos.roItemMove',
	'mosRoItemDelete' 	= 'peripheralDevice.mos.RoItemDelete',
	'mosRoItemSwap' 	= 'peripheralDevice.mos.RoItemSwap',
	'mosRoReadyToAir' 	= 'peripheralDevice.mos.RoReadyToAir',
	'mosRoFullStory' 	= 'peripheralDevice.mos.RoFullStory',

	'getMediaObjectRevisions' 	= 'peripheralDevice.mediaScanner.getMediaObjectRevisions',
	'updateMediaObject' 		= 'peripheralDevice.mediaScanner.updateMediaObject'
}

export type initialize = (id: string, token: string, options: InitOptions) => Promise<string>
export type unInitialize = (id: string, token: string, status: StatusObject) => Promise<StatusObject>
export type setStatus = (id: string, token: string, status: StatusObject) => Promise<StatusObject>

}
