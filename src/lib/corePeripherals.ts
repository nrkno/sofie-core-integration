/**
 * Note: This file contains a copy of the typings from meteor/lib/api/peripheralDevice.ts in Core
 */

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
// Note The actual type of a device is determined by the Category, Type and SubType
export enum DeviceCategory {
	INGEST = 'ingest',
	PLAYOUT = 'playout',
	MEDIA_MANAGER = 'media_manager'
}
export enum DeviceType {
	// Ingest devices:
	MOS 			= 'mos',
	SPREADSHEET 	= 'spreadsheet',
	// Playout devices:
	PLAYOUT 		= 'playout',
	// Media-manager devices:
	MEDIA_MANAGER 	= 'media_manager'
}
export type DeviceSubType = SUBTYPE_PROCESS | TSR_DeviceType | MOS_DeviceType | Spreadsheet_DeviceType

export type SUBTYPE_PROCESS = '_process'
export const SUBTYPE_PROCESS: SUBTYPE_PROCESS = '_process'
export type MOS_DeviceType = 'mos_connection'
export type Spreadsheet_DeviceType = 'spreadsheet_connection'
export type TSR_DeviceType = number

export interface InitOptions {
	category: DeviceCategory
	type: DeviceType
	subType: DeviceSubType

	name: string
	connectionId: string
	parentDeviceId?: string
	versions?: {
		[libraryName: string]: string
	}
}
export type TimelineTriggerTimeResult = Array<{id: string, time: number}>

export interface PartPlaybackStartedResult {
	rundownId: string,
	partId: string,
	time: number
}
export type PartPlaybackStoppedResult = PartPlaybackStartedResult
export interface PiecePlaybackStartedResult {
	rundownId: string,
	pieceId: string,
	time: number
}
export type PiecePlaybackStoppedResult = PiecePlaybackStartedResult

export enum methods {
	'functionReply' 	= 'peripheralDevice.functionReply',

	'testMethod' 		= 'peripheralDevice.testMethod',
	'setStatus' 		= 'peripheralDevice.status',
	'ping' 				= 'peripheralDevice.ping',
	'initialize' 		= 'peripheralDevice.initialize',
	'unInitialize' 		= 'peripheralDevice.unInitialize',
	'getPeripheralDevice'= 'peripheralDevice.getPeripheralDevice',
	'pingWithCommand' 	= 'peripheralDevice.pingWithCommand',
	'killProcess' 		= 'peripheralDevice.killProcess',

	'determineDiffTime'		= 'systemTime.determineDiffTime',
	'getTimeDiff'			= 'systemTime.getTimeDiff',
	'getTime'				= 'systemTime.getTime',

	'timelineTriggerTime'			= 'peripheralDevice.timeline.setTimelineTriggerTime',
	'partPlaybackStarted' 	= 'peripheralDevice.rundown.partPlaybackStarted',
	'partPlaybackStopped' 	= 'peripheralDevice.rundown.partPlaybackStopped',
	'piecePlaybackStarted'= 'peripheralDevice.rundown.piecePlaybackStarted',
	'piecePlaybackStopped'= 'peripheralDevice.rundown.piecePlaybackStopped',

	'mosRoCreate' 		= 'peripheralDevice.mos.roCreate',
	'mosRoReplace' 		= 'peripheralDevice.mos.roReplace',
	'mosRoDelete' 		= 'peripheralDevice.mos.roDelete',
	'mosRoDeleteForce'	= 'peripheralDevice.mos.roDeleteForce',
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
	'mosRoItemDelete' 	= 'peripheralDevice.mos.roItemDelete',
	'mosRoItemSwap' 	= 'peripheralDevice.mos.roItemSwap',
	'mosRoReadyToAir' 	= 'peripheralDevice.mos.roReadyToAir',
	'mosRoFullStory' 	= 'peripheralDevice.mos.roFullStory',

	'dataRundownDelete'	= 'peripheralDevice.rundown.rundownDelete',
	'dataRundownCreate'	= 'peripheralDevice.rundown.rundownCreate',
	'dataRundownUpdate'	= 'peripheralDevice.rundown.rundownUpdate',
	'dataSegmentDelete'	= 'peripheralDevice.rundown.segmentDelete',
	'dataSegmentCreate'	= 'peripheralDevice.rundown.segmentCreate',
	'dataSegmentUpdate'	= 'peripheralDevice.rundown.segmentUpdate',
	'dataPartDelete'	= 'peripheralDevice.rundown.partDelete',
	'dataPartCreate'	= 'peripheralDevice.rundown.partCreate',
	'dataPartUpdate'	= 'peripheralDevice.rundown.partUpdate',

	'resyncRundown'			= 'peripheralDevice.mos.roResync',

	'getMediaObjectRevisions' 	= 'peripheralDevice.mediaScanner.getMediaObjectRevisions',
	'updateMediaObject' 		= 'peripheralDevice.mediaScanner.updateMediaObject',

	'getMediaWorkFlowRevisions' = 'peripheralDevice.mediaManager.getMediaWorkFlowRevisions',
	'updateMediaWorkFlow' = 'peripheralDevice.mediaManager.updateMediaWorkFlow',
	'getMediaWorkFlowStepRevisions' = 'peripheralDevice.mediaManager.getMediaWorkFlowStepRevisions',
	'updateMediaWorkFlowStep' = 'peripheralDevice.mediaManager.updateMediaWorkFlowStep',

	'requestUserAuthToken' 	= 'peripheralDevice.spreadsheet.requestUserAuthToken',
	'storeAccessToken' 	= 'peripheralDevice.spreadsheet.storeAccessToken'

}

export type initialize = (id: string, token: string, options: InitOptions) => Promise<string>
export type unInitialize = (id: string, token: string, status: StatusObject) => Promise<StatusObject>
export type setStatus = (id: string, token: string, status: StatusObject) => Promise<StatusObject>
export type executeFunction = (deviceId: string, cb: (err: any, result: any) => void, functionName: string, ...args: any[]) => void

}
