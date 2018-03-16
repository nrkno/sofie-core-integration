import { EventEmitter } from 'events'

import {DDPConnector, DDPConnectorOptions} from './ddpConnector'
import {PeripheralDeviceAPI as P} from './corePeripherals'

export enum DeviceType {
	MOSDEVICE = 0,
	PLAYOUT = 1
}
export interface InitOptions {
	type: DeviceType,
	name: string
}

export interface CoreOptions {
	deviceId: string,
	deviceToken: string,
	deviceType: DeviceType
	deviceName: string,

}

export class CoreConnection extends EventEmitter {

	private _ddp: DDPConnector
	private _coreOptions: CoreOptions

	constructor (coreOptions) {
		super()

		this._coreOptions = coreOptions
	}

	init (ddpOptions?: DDPConnectorOptions): Promise<string> {

		ddpOptions = ddpOptions || {
			host: '127.0.0.1',
			port: 3000
		}

		this._ddp = new DDPConnector(ddpOptions)

		this._ddp.on('error', (err) => {
			console.log('Error', err)
		})
		this._ddp.on('failed', (err) => {
			console.log('Failed: ', err.toString())
		})

		this._ddp.onConnected = () => {
			this.emit('connected')
		}

		return new Promise((resolve) => {

			this._ddp.createClient()

			resolve()

		}).then(() => {
			return this._ddp.connect()
		}).then(() => {

			// at this point, we're connected to Core
			let options: InitOptions = {
				type: this._coreOptions.deviceType,
				name: this._coreOptions.deviceName
			}

			return new Promise<string>((resolve, reject) => {
				this._ddp.ddpClient.call(P.methods.initialize, [
					this._coreOptions.deviceId,
					this._coreOptions.deviceToken,
					options
				], (err: Error, id: string) => {
					if (err) {
						reject(err)
					} else {
						resolve(id)
					}
				})
			})
		})
	}

	onConnected (cb: () => void ) {
		this.on('connected', cb)
	}
	get connected () {
		return this._ddp.connected
	}
	get deviceId () {
		return this._coreOptions.deviceId
	}

	setStatus (status: P.StatusObject): Promise<P.StatusObject> {

		return new Promise((resolve, reject) => {

			this._ddp.ddpClient.call(P.methods.setStatus, [
				this._coreOptions.deviceId,
				this._coreOptions.deviceToken,
				status
			], (err: Error, returnedStatus: P.StatusObject) => {
				if (err) {
					reject(err)
				} else {
					resolve(returnedStatus)
				}
			})
		})
	}

	unInitialize (): Promise<string> {
		return new Promise((resolve, reject) => {

			this._ddp.ddpClient.call(P.methods.unInitialize, [
				this._coreOptions.deviceId,
				this._coreOptions.deviceToken
			], (err: Error, id: string) => {
				if (err) {
					reject(err)
				} else {
					resolve(id)
				}
			})
		})
	}
}
