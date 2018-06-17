import { EventEmitter } from 'events'
import * as _ from 'underscore'

import { DDPConnector, DDPConnectorOptions, Observer } from './ddpConnector'
import { PeripheralDeviceAPI as P, PeripheralDeviceAPI } from './corePeripherals'
import { TimeSync } from './timeSync'

const DataStore = require('data-store')
const Random = require('ddp-random')

export interface InitOptions {
	type: P.DeviceType,
	name: string,
	connectionId: string,
	parentDeviceId?: string,
	versions?: {
		[libraryName: string]: string
	}
}

export interface CoreCredentials {
	deviceId: string,
	deviceToken: string
}

export interface CoreOptions extends CoreCredentials {
	deviceType: P.DeviceType
	deviceName: string,
	versions?: {
		[libraryName: string]: string
	}

}
export interface CollectionObj {
	_id: string
	[key: string]: any
}
export interface Collection {
	find: (selector: any) => Array<CollectionObj>
	findOne: (selector: any) => CollectionObj
}

export class CoreConnection extends EventEmitter {

	private _ddp: DDPConnector
	private _parent: CoreConnection | null = null
	private _children: Array<CoreConnection> = []
	private _coreOptions: CoreOptions
	private _timeSync: TimeSync

	private _sentConnectionId: string = ''

	constructor (coreOptions: CoreOptions) {
		super()

		this._coreOptions = coreOptions

	}
	static getStore (name: string) {
		return new DataStore(name)
	}
	static getCredentials (name: string): CoreCredentials {
		let store = CoreConnection.getStore(name)

		let credentials: CoreCredentials = store.get('CoreCredentials')
		if (!credentials) {
			credentials = CoreConnection.generateCredentials()
			store.set('CoreCredentials', credentials)
		}

		return credentials
	}
	static deleteCredentials (name: string) {
		let store = CoreConnection.getStore(name)

		store.set('CoreCredentials', null)
	}
	static generateCredentials (): CoreCredentials {
		return {
			deviceId: Random.id(),
			deviceToken: Random.id()
		}
	}
	init (ddpOptionsORParent?: DDPConnectorOptions | CoreConnection): Promise<string> {
		if (ddpOptionsORParent instanceof CoreConnection) {
			this._setParent(ddpOptionsORParent)

			return Promise.resolve()
				.then(() => {
					return this._sendInit()
				})
		} else {
			let ddpOptions = ddpOptionsORParent || {
				host: '127.0.0.1',
				port: 3000
			}
			ddpOptions.autoReconnect = true
			ddpOptions.autoReconnectTimer = 1000
			return new Promise((resolve) => {
				this._ddp = new DDPConnector(ddpOptions)

				this._ddp.on('error', (err) => {
					this.emit('error', err)
				})
				this._ddp.on('failed', (err) => {
					this.emit('failed', err)
				})
				this._ddp.on('connectionChanged', (connected: boolean) => {
					this.emit('connectionChanged', connected)

					this._maybeSendInit()
					.catch((err) => {
						this.emit('error', err)
					})
				})
				this._ddp.on('connected', () => {
					this.emit('connected')
				})
				this._ddp.on('disconnected', () => {
					this.emit('disconnected')
				})
				this._ddp.createClient()
				resolve()
			}).then(() => {
				return this._ddp.connect()
			}).then(() => {
				return this._sendInit()
			})
			.then((deviceId) => {
				// console.log('syncing systemTime...')
				this._timeSync = new TimeSync({
					serverDelayTime: 0
				}, () => {
					return this.callMethod(PeripheralDeviceAPI.methods.getTimeDiff)
					.then((stat) => {
						return stat.currentTime
					})
				})

				return this._timeSync.init()
				.then(() => {
					// console.log('Time synced! (diff: ' + this._timeSync.diff + ', quality: ' + this._timeSync.quality + ')')
					return deviceId
				})
			})
		}
	}
	destroy (): Promise<void> {
		if (this._parent) {
			this._removeParent()
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
	onConnectionChanged (cb: (connected: boolean) => void) {
		this.on('connectionChanged', cb)
	}
	onConnected (cb: () => void) {
		this.on('connected', cb)
	}
	onDisconnected (cb: () => void) {
		this.on('disconnected', cb)
	}
	onError (cb: (err: Error) => void) {
		this.on('error', cb)
	}
	onFailed (cb: (err: Error) => void) {
		this.on('failed', cb)
	}
	get ddp (): DDPConnector {
		if (this._parent) return this._parent.ddp
		else return this._ddp
	}
	get connected () {
		return (this.ddp ? this.ddp.connected : false)
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
	callMethod (methodName: PeripheralDeviceAPI.methods | string, attrs?: Array<any>): Promise<any> {
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
		return this.callMethod(P.methods.unInitialize)
	}
	mosManipulate (method: string, ...attrs: Array<any>) {
		return this.callMethod(method, attrs)
	}
	getPeripheralDevice (): Promise<any> {
		return this.callMethod(P.methods.getPeripheralDevice)
	}
	getCollection (collectionName: string): Collection {
		let collection = this.ddp.ddpClient.collections[collectionName] || {}

		let c: Collection = {
			find (selector?: any): Array<CollectionObj> {
				if (_.isUndefined(selector)) {
					return _.values(collection)
				} else if (_.isObject(selector)) {
					return _.where(_.values(collection), selector)
				} else if (_.isFunction(selector)) {
					return _.filter(_.values(collection), selector)
				} else {
					return [collection[selector]]
				}
			},
			findOne (selector: any): CollectionObj {
				return c.find(selector)[0]
			}
		}
		return c
	}
	subscribe (publicationName: string, ...params: Array<any>): Promise<string> {
		return new Promise((resolve, reject) => {
			try {
				let subscriptionId = this.ddp.ddpClient.subscribe(
					publicationName,	// name of Meteor Publish function to subscribe to
					params.concat([this._coreOptions.deviceToken]), // parameters used by the Publish function
					() => { 		// callback when the subscription is complete
						resolve(subscriptionId)
					}
				)
			} catch (e) {
				console.log(this.ddp.ddpClient)
				reject(e)
			}
		})
	}
	unsubscribe (subscriptionId: string): void {
		this.ddp.ddpClient.unsubscribe(subscriptionId)
	}
	observe (collectionName: string): Observer {
		return this.ddp.ddpClient.observe(collectionName)
	}
	getCurrentTime (): number {
		return this._timeSync.currentTime()
	}
	hasSyncedTime (): boolean {
		return this._timeSync.isGood()
	}
	syncTimeQuality (): number | null {
		return this._timeSync.quality
	}

	private _maybeSendInit (): Promise<any> {
		// If the connectionId has changed, we should report that to Core:
		if (this.ddp && this.ddp.connectionId !== this._sentConnectionId) {
			return this._sendInit()
		} else {
			return Promise.resolve()
		}
	}
	private _sendInit (): Promise<string> {
		if (!this.ddp) throw Error('Not connected to Core')

		let options: InitOptions = {
			type: this._coreOptions.deviceType,
			name: this._coreOptions.deviceName,
			connectionId: this.ddp.connectionId,
			parentDeviceId: (this._parent && this._parent.deviceId) || undefined,
			versions: this._coreOptions.versions
		}
		this._sentConnectionId = options.connectionId

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
	private _removeParent () {
		if (this._parent) this._parent.removeChild(this)
		this._parent = null

		this.emit('connectionChanged', false)
		this.emit('disconnected')
	}
	private _setParent (parent: CoreConnection) {
		this._parent = parent
		parent.addChild(this)

		parent.on('connectionChanged', (connected) => { this.emit('connectionChanged', connected) })
		parent.on('connected', () => { this.emit('connected') })
		parent.on('disconnected', () => { this.emit('disconnected') })

		if (this.connected) {
			this.emit('connected')
		} else {
			this.emit('disconnected')
		}
		this.emit('connectionChanged', this.connected)
	}
}
