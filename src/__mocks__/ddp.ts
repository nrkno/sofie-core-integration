import { EventEmitter } from 'events'
import * as _ from 'underscore'

const orgSetTimeout = setTimeout

const ddpSessions: Array<DDP> = []

const constructors: Array<Function> = []

interface Collections {
	[collectionName: string]: Collection
}

interface Collection {
	[id: string]: {
		_id: string,
		[attr: string]: any
	}
}
class Socket extends EventEmitter {
	private _connectOk: boolean = true
	public connect () {

		if (this._connectOk) {
			orgSetTimeout(() => {
				this.emit('connect')
			}, 1)
		} else {
			orgSetTimeout(() => {
				this.emit('error', 'Network error, mock')
			}, 1)
		}
	}
	public close () {

		orgSetTimeout(() => {
			this.emit('close')
		}, 1)
	}
	public mockConnectOK (connectOk: boolean) {
		this._connectOk = connectOk
	}
}
class Subscription {
	private _ddp: DDP
	private _collections: Collections = {}

	private _unsubscribed: boolean = false

	constructor (ddp: DDP) {
		this._ddp = ddp
	}

	public getCollection (collectionName: string): Collection {
		if (this._unsubscribed) return {}
		return this._collections[collectionName] || {}
	}
	public getCollections (): Collections {
		if (this._unsubscribed) return {}
		return this._collections
	}

	public mockCollectionAdd (collectionName: string, doc: any) {
		if (!this._collections[collectionName]) this._collections[collectionName] = {}

		this._collections[collectionName][doc._id] = doc

		this._ddp.notifyAdd(collectionName, doc)
	}
	public mockCollectionChange (collectionName: string, doc: any) {
		if (!this._collections[collectionName]) this._collections[collectionName] = {}

		this._collections[collectionName][doc._id] = doc

		this._ddp.notifyChange(collectionName, doc)
	}
	public mockCollectionRemove (collectionName: string, docId: string) {
		if (!this._collections[collectionName]) this._collections[collectionName] = {}

		delete this._collections[collectionName][docId]
		this._ddp.notifyRemove(collectionName, docId)
	}
	public unsubscribe () {
		this._unsubscribed = true
		// remove all
		_.each(this._collections, (collection, collectionName) => {
			_.each(collection, (_doc, docId) => {
				if (!this._ddp.getDocument(collectionName, docId)) {
					// if the document is not found, it's not set by any other subscription either
					this._ddp.notifyRemove(collectionName, docId)
				}
			})
		})
	}
}
class Observer {
	public added: (id: string, doc: any) => void
	public changed: (id: string, doc: any) => void
	public removed: (id: string) => void

	constructor (_collectionName: any) {
		//
	}
	public mockAdd (doc: any) {
		if (this.added) this.added(doc._id, doc)
	}
	public mockChange (doc: any) {
		if (this.changed) this.changed(doc._id, doc)
	}
	public mockRemove (id: string) {
		if (this.removed) this.removed(id)
	}
}
class DDP extends EventEmitter {
	public socket: Socket
	public host: string
	public port: number
	public path: string
	public ssl: boolean
	public useSockJS: boolean
	public autoReconnect: boolean
	public autoReconnectTimer: number
	public ddpVersion: string
	public session: string

	private _mockHost: string
	private _mockPort: number

	// public _collections: Collections = {}

	private _mockCalls: {[methodName: string]: (...attrs: any[]) => any} = {}
	private _mockPublications: {[publicationName: string]: (sub: Subscription, ...attrs: any[]) => void} = {}
	private _mockObservers: {[collectionName: string]: Array<Observer>} = {}
	private _mockSubscriptions: {[subscriptionId: string]: Subscription} = {}

	constructor (o: any) {
		super()

		this.host 					= o.host
		this.port 					= o.port
		this.path 					= o.path
		this.ssl 					= o.ssl
		this.useSockJS 				= o.useSockJS
		this.autoReconnect 			= o.autoReconnect
		this.autoReconnectTimer 	= o.autoReconnectTimer
		// this.maintain_collections= o.maintain_collections
		this.ddpVersion 			= o.ddpVersion

		ddpSessions.push(this)

		let constr = constructors.shift()
		if (constr) {
			constr(this)
		}
	}
	public static getMockSessions () {
		return ddpSessions
	}
	public static mockConstructNext (cb: (ddp: DDP) => void) {
		constructors.push(cb)
	}
	/*
	this.emit('socket-close')
	this.emit('socket-error', err)
	this.emit('message', message)
	this.emit('connected', message)
	this.emit('failed', message)
	*/
	public connect (onConnectCb?: (err?: Error | string) => void) {
		this.session = 'mockSession_' + Math.random()

		this.socket = new Socket()
		this.socket.on('connect', () => {
			if (onConnectCb) {
				onConnectCb()
				onConnectCb = undefined
			}
			this.emit('connected')
		})
		this.socket.on('error', (err) => {
			if (onConnectCb) {
				onConnectCb(err)
				onConnectCb = undefined
			}
			this.emit('socket-error', err)
		})
		this.socket.on('close', () => {
			this.emit('socket-close')
		})

		this.socket.mockConnectOK(this._mockHost === this.host && this._mockPort === this.port)

		this.socket.connect()

	}
	public close () {
		this.socket.close()
	}
	public call (methodName: string, attrs: any[], cb: (err: Error | Object | null, result: any) => void) {

		if (_.has(this._mockCalls, methodName)) {
			let c = this._mockCalls[methodName]
			if (c) {
				orgSetTimeout(() => {
					try {
						let result = c(...attrs)

						Promise.resolve(result)
						.then((result) => {
							cb(null, result)
						})
						.catch((err) => {
							cb(err, null)
						})
					} catch (err) {
						cb(err, null)
					}
				}, 1)
			} else {
				cb({ error: 404, reason: 'Method not found' }, null)
			}
		} else {
			console.log('Method Attributes:', attrs)
			throw new Error('DDP mock: mockMethod "' + methodName + '" not set up, call mockCall')
		}
	}
	public observe (collectionName: string) {
		// todo: implement
		let obs = new Observer(collectionName)
		if (!this._mockObservers[collectionName]) this._mockObservers[collectionName] = []
		this._mockObservers[collectionName].push(obs)
		return obs
	}
	public get collections () {
		// return this._collections

		let collections: any = {}

		_.each(this._mockSubscriptions, (sub) => {
			_.each(sub.getCollections(), (collection, collectionName) => {
				_.each(collection, (doc, docId) => {
					if (!collections[collectionName]) collections[collectionName] = {}

					collections[collectionName][docId] = doc
				})
			})
		})
		return collections
	}
	subscribe (publicationName: string, attrs: Array<any>, cb: () => void) {
		let pub = this._mockPublications[publicationName]
		if (pub) {
			let subscriptionId = 'mockSubscription_' + Math.random()

			let sub = new Subscription(this)

			this._mockSubscriptions[subscriptionId] = sub

			pub(sub, ...attrs)

			orgSetTimeout(() => {
				cb()
			}, 1)
			return subscriptionId
		} else {
			console.log('Publication Attributes:', attrs)
			throw Error('DDP mock: publication "' + publicationName + '" not set')
		}
	}
	unsubscribe (subscriptionId: string) {
		let sub = this._mockSubscriptions[subscriptionId]
		sub.unsubscribe()

		delete this._mockSubscriptions[subscriptionId]
	}

	// mock-functions:
	// public mockDisconnect() {

	// }
	public mockCall (methodName: string, cb: (...attrs: any[]) => any) {
		this._mockCalls[methodName] = cb
	}
	// public mockCollection (collectionName: string, objects: Array<any>) {
	// 	_.each(objects, (obj) => {
	// 		this.mockCollectionAdd(collectionName, obj)
	// 	})
	// }
	public mockPublication (publicationName: string, cb: (sub: Subscription, ...attrs: any[]) => void) {
		this._mockPublications[publicationName] = cb
	}
	public notifyAdd (collectionName: string, doc: any) {
		_.each(this._mockObservers[collectionName], (obs) => {
			obs.mockAdd(doc)
		})
	}
	public notifyChange (collectionName: string, doc: any) {
		_.each(this._mockObservers[collectionName], (obs) => {
			obs.mockChange(doc)
		})
	}
	public notifyRemove (collectionName: string, docId: string) {
		_.each(this._mockObservers[collectionName], (obs) => {
			obs.mockRemove(docId)
		})
	}

	public mockSetHost (host: string, port: number) {
		this._mockHost = host
		this._mockPort = port
	}

	public getDocument (searchForCollectionName: string, searchForDocId: string) {

		let foundDoc = null
		_.find(this._mockSubscriptions, (sub) => {
			return _.find(sub.getCollections(), (collection, collectionName) => {
				if (collectionName === searchForCollectionName) {
					return _.find(collection, (doc, docId) => {
						if (docId === searchForDocId) {
							foundDoc = doc
							return true
						} else {
							return false
						}
					})
				} else return false
			})
		})
		return foundDoc
	}
}
module.exports = DDP
