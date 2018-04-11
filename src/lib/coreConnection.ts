import { EventEmitter } from 'events'

import {DDPConnector, DDPConnectorOptions} from './ddpConnector'
import {PeripheralDeviceAPI as P} from './corePeripherals'

const Random = require('ddp-random')

const DataStore = require('data-store')

export enum DeviceType {
	MOSDEVICE = 0,
	PLAYOUT = 1
}
export interface InitOptions {
	type: DeviceType,
	name: string,
	connectionId: string
}

export interface CoreCredentials {
	deviceId: string,
	deviceToken: string
}

export interface CoreOptions extends CoreCredentials {
	deviceType: DeviceType
	deviceName: string,

}

export class CoreConnection extends EventEmitter {

	private _ddp: DDPConnector
	private _parent: CoreConnection
	private _children: Array<CoreConnection> = []
	private _coreOptions: CoreOptions

	constructor (coreOptions: CoreOptions) {
		super()

		this._coreOptions = coreOptions
	}
	static getCredentials (name: string): CoreCredentials {
		let store = DataStore(name)

		let credentials: CoreCredentials = store.get('CoreCredentials')
		if (!credentials) {
			credentials = CoreConnection.generateCredentials()
			store.set('CoreCredentials', credentials)
		}

		return credentials
	}
	static deleteCredentials (name: string) {
		let store = DataStore(name)

		store.set('CoreCredentials', null)
	}
	static generateCredentials (): CoreCredentials {
		return {
			deviceId: Random.id(),
			deviceToken: Random.id()
		}
	}
	init (ddpOptionsORParent?: DDPConnectorOptions | CoreConnection): Promise<string> {

		let doInit = () => {
			console.log('doInit')
			// at this point, we're connected to Core
			let options: InitOptions = {
				type: this._coreOptions.deviceType,
				name: this._coreOptions.deviceName,
				connectionId: this.ddp.connectionId
			}

			return new Promise<string>((resolve, reject) => {
				this.ddp.ddpClient.call(P.methods.initialize, [
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
		}
		if (ddpOptionsORParent instanceof CoreConnection ) {
			let parent = ddpOptionsORParent
			this._parent = parent
			parent.addChild(this)

			return Promise.resolve()
				.then(doInit)
		} else {
			let ddpOptions = ddpOptionsORParent || {
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
			}).then(doInit)
		}
	}
	destroy (): Promise<void> {
		if (this._parent) {
			this._parent.removeChild(this)
		} else {
			if (this._ddp) {
				this._ddp.close()
			}
		}
		return Promise.resolve()
	}
	addChild (child: CoreConnection) {
		this._children.push(child)
	}
	removeChild (childToRemove: CoreConnection) {
		let removeIndex = -1
		this._children.forEach((c, i) => {
			if (c === childToRemove) removeIndex = i
		})
		if (removeIndex !== -1) {
			this._children.splice(removeIndex, 1)
		}
	}
	onConnected (cb: () => void ) {
		this.on('connected', cb)
	}
	get ddp () {
		if (this._parent) return this._parent.ddp
		else return this._ddp
	}
	get connected () {
		return this.ddp.connected
	}
	get deviceId () {
		return this._coreOptions.deviceId
	}
	setStatus (status: P.StatusObject): Promise<P.StatusObject> {

		return new Promise((resolve, reject) => {

			this.ddp.ddpClient.call(P.methods.setStatus, [
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
	call (methodName: string, attrs?: Array<any>): Promise<any> {
		return new Promise((resolve, reject) => {

			let fullAttrs = [
				this._coreOptions.deviceId,
				this._coreOptions.deviceToken
			].concat(attrs || [])

			this.ddp.ddpClient.call(methodName, fullAttrs, (err: Error, id: string) => {
				if (err) {
					reject(err)
				} else {
					resolve(id)
				}
			})
		})
	}
	unInitialize (): Promise<string> {
		return this.call(P.methods.unInitialize)
	}
	mosManipulate (method: string, ...attrs: Array<any>) {
		return this.call(method, attrs)
	}
}
