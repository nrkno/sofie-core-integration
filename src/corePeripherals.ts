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
	PLAYOUT = 1
}
export interface InitOptions {
	type: DeviceType,
	name: string
}

export enum methods {
	setStatus 		= 'peripheralDevice.status',
	initialize 		= 'peripheralDevice.initialize',
	unInitialize 	= 'peripheralDevice.unInitialize'
}

export type initialize = (id: string, token: string, options: InitOptions) => Promise<string>
export type unInitialize = (id: string, token: string, status: StatusObject) => Promise<StatusObject>
export type setStatus = (id: string, token: string, status: StatusObject) => Promise<StatusObject>

}
