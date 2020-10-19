/**
 * DDP client. Based on:
 *
 * * https://github.com/nytamin/node-ddp-client
 * * https://github.com/oortcloud/node-ddp-client
 *
 * Brought into this project for maintenance reasons, including conversion to Typescript.
 */
/// <reference types="../types/faye-websocket" />

import * as WebSocket from 'faye-websocket'
import * as EJSON from 'ejson'
import { EventEmitter } from 'events'
import got from 'got'

export interface TLSOpts {
	// Described in https://nodejs.org/api/tls.html#tls_tls_connect_options_callback

	/* Necessary only if the server uses a self-signed certificate.*/
	ca?: Buffer[] // example: [ fs.readFileSync('server-cert.pem') ]

	/* Necessary only if the server requires client certificate authentication.*/
	key?: Buffer // example: fs.readFileSync('client-key.pem'),
	cert?: Buffer // example: fs.readFileSync('client-cert.pem'),

	/* Necessary only if the server's cert isn't for "localhost". */
	checkServerIdentity?: (hostname: string, cert: object) => Error | undefined // () => { }, // Returns <Error> object, populating it with reason, host, and cert on failure. On success, returns <undefined>.
}

/**
 * Options set when creating a new DDP client connection.
 */
export interface DDPConnectorOptions {
	host: string
	port: number
	path?: string
	ssl?: boolean
	debug?:	boolean
	autoReconnect?: boolean // default: true
	autoReconnectTimer?: number
	tlsOpts?: TLSOpts
	useSockJs?: boolean
	url?: string
	maintainCollections?: boolean
	ddpVersion?: '1' | 'pre2' | 'pre1'
}

/**
 * Observer watching for changes to a collection.
 */
export interface Observer {
	/** Name of the collection being observed */
	readonly name: string
	/** Identifier of this observer */
	readonly id: string
	/**
	 * Callback when a document is added to a collection.
	 * @callback
	 * @param id Identifier of the document added
	 * @param fields The added document
	 */
	added: (id: string, fields?: { [attr: string]: unknown }) => void
	/** Callback when a document is changed in a collection. */
	changed: (id: string, oldFields: { [attr: string]: unknown }, clearedFields: Array<string>, newFields: { [attr: string]: unknown }) => void
	/** Callback when a document is removed from a collection. */
	removed: (id: string, oldValue: { [attr: string]: unknown }) => void
	/** Request to stop observing the collection */
	stop: () => void
}

/** DDP message type for client requests to servers */
export type ClientServer = 'connect' | 'ping' | 'pong' | 'method' | 'sub' | 'unsub'
/** DDP message type for server requests to clients */
export type ServerClient = 'failed' | 'connected' | 'result' | 'updated' | 'nosub' | 'added' | 'removed' | 'changed' | 'ready' | 'ping' | 'pong' | 'error'
/** All types of DDP messages */
export type MessageType = ClientServer | ServerClient

/**
 * Represents any DDP message sent from as a request or response from a server to a client.
 */
export interface Message {
	/** Kind of meteor message */
	msg: MessageType
}

/**
 * DDP-specified error.
 * Note. Different fields to a Javascript error.
 */
export interface DDPError {
	error: string | number
	reason?: string
	message?: string
	errorType: 'Meteor.Error'
}

/**
 * Request message to initiate a connection from a client to a server.
 */
interface Connect extends Message {
	msg: 'connect'
	/** If trying to reconnect to an existing DDP session */
	session?: string
	/** The proposed protocol version */
	version: string
	/** Protocol versions supported by the client, in order of preference */
	support: Array<string>
}

/**
 * Response message sent when a client's connection request was successful.
 */
interface Connected extends Message {
	msg: 'connected'
	/** An identifier for the DDP session */
	session: string
}

/**
 * Response message when a client's connection request was unsuccessful.
 */
interface Failed extends Message {
	msg: 'failed'
	/** A suggested protocol version to connect with */
	version: string
}

/**
 * Heartbeat request message. Can be sent from server to client or client to server.
 */
interface Ping extends Message {
	msg: 'ping'
	/** Identifier used to correlate with response */
	id?: string
}

/**
 * Heartbeat response message.
 */

interface Pong extends Message {
	msg: 'pong'
	/** Same as received in the `ping` message */
	id?: string
}

/**
 * Message from the client specifying the sets of information it is interested in.
 * The server should then send `added`, `changed` and `removed` messages matching
 * the subscribed types.
 */
interface Sub extends Message {
	msg: 'sub'
	/** An arbitrary client-determined identifier for this subscription */
	id: string
	/** Name of the subscription */
	name: string
	/** Parameters to the subscription. Most be serializable to EJSON. */
	params?: Array<unknown>
}

/**
 * Request to unsubscribe from messages related to an existing subscription.
 */
interface UnSub extends Message {
	msg: 'unsub'
	/** The `id` passed to `sub` */
	id: string
}

/**
 * Message sent when a subscription is unsubscribed. Contains an optional error if a
 * problem occurred.
 */
interface NoSub extends Message {
	msg: 'nosub'
	/** The client `id` passed to `sub` for this subscription. */
	id: string
	/** An error raised by the subscription as it concludes, or sub-not-found */
	error?: DDPError
}

/**
 * Notification that a document has been added to a collection.
 */
interface Added extends Message {
	msg: 'added'
	/** Collection name */
	collection: string
	/** Document identifier */
	id: string
	/** Document values - serializable with EJSON */
	fields?: { [ attr: string]: unknown }
}

/**
 * Notification that a document has changed within a collection.
 */
interface Changed extends Message {
	msg: 'changed'
	/** Collection name */
	collection: string
	/** Document identifier */
	id: string
	/** Document values - serializable with EJSON */
	fields?: { [ attr: string]: unknown }
	/** Field names to delete */
	cleared?: Array<string>
}

/**
 * Notification that a document has been removed from a collection.
 */
interface Removed extends Message {
	msg: 'removed'
	/** Collection name */
	collection: string
	/** Document identifier */
	id: string
}

/**
 * Message sent to client after an initial salvo of updates have sent a
 * complete set of initial data.
 */
interface Ready extends Message {
	msg: 'ready'
	/** Identifiers passed to `sub` which have sent their initial batch of data */
	subs: Array<string>
}

/**
 * Remote procedure call request request.
 */
interface Method extends Message {
	msg: 'method'
	/** Method name */
	method: string
	/** Parameters to the method */
	params?: Array<unknown>
	/** An arbitrary client-determined identifier for this method call */
	id: string
	/** An arbitrary client-determined seed for pseudo-random generators  */
	randomSeed?: string
}

/**
 * Remote procedure call response message, either an error or a return value _result_.
 */
interface Result extends Message {
	msg: 'result'
	/** Method name */
	id: string
	/** An error thrown by the method, or method nor found */
	error?: DDPError
	/** Return value of the method */
	result?: unknown
}

/**
 * Message sent to indicate that all side-effect changes to subscribed data caused by
 * a method have completed.
 */
interface Updated extends Message {
	msg: 'updated'
	/** Identifiers passed to `method`, all of whose writes have been reflected in data messages */
	methods: Array<string>
}

/**
 * Erroneous messages sent from the client to the server can result in receiving a top-level
 * `error` message in response.
 */
interface ErrorMessage extends Message {
	msg: 'error'
	/** Description of the error */
	reason: string
	/** If the original message parsed properly, it is included here */
	offendingMessage?: Message
}

export type AnyMessage =
	Connect |
	Connected |
	Failed |
	Ping |
	Pong |
	Sub |
	UnSub |
	NoSub |
	Added |
	Changed |
	Removed |
	Ready |
	Method |
	Result |
	Updated |
	ErrorMessage

/**
 * Class reprsenting a DDP client and its connection.
 */
export class DDPClient extends EventEmitter {

	public collections: {
		[collectionName: string]: {
			[id: string]: {
				_id: string,
				[attr: string]: unknown
			}
		}
	}

	public socket: WebSocket.Client
	public session: string

	private hostInt: string
	public get host (): string { return this.hostInt }
	private portInt: number
	public get port (): number { return this.portInt }
	private pathInt?: string
	public get path (): string | undefined { return this.pathInt }
	private sslInt: boolean
	public get ssl (): boolean { return this.sslInt }
	private useSockJSInt: boolean
	public get useSockJS (): boolean { return this.useSockJSInt }
	private autoReconnectInt: boolean
	public get autoReconnect () { return this.autoReconnectInt }
	private autoReconnectTimerInt: number
	public get autoReconnectTimer (): number { return this.autoReconnectTimerInt }
	private ddpVersionInt: '1' | 'pre2' | 'pre1'
	public get ddpVersion () { return this.ddpVersionInt }
	private urlInt?: string
	public get url (): string | undefined { return this.urlInt }
	private maintainCollectionsInt: boolean
	public get maintainCollections (): boolean { return this.maintainCollectionsInt }

	public static readonly ERRORS: { [ name: string]: DDPError } = {
		DISCONNECTED: {
			error: 'DISCONNECTED',
			message: 'DDPClient: Disconnected from DDP server',
			errorType: 'Meteor.Error'
		}
	}
	public static readonly supportedDdpVersions = [ '1', 'pre2', 'pre1']

	private tlsOpts: TLSOpts
	private isConnecting: boolean = false
	private isReconnecting: boolean = false
	private isClosing: boolean = false
	private connectionFailed: boolean = false
	private nextId: number = 0
	private callbacks: { [id: string]: (error?: DDPError, result?: unknown) => void } = {}
	private updatedCallbacks: { [name: string]: Function } = {}
	private pendingMethods: { [id: string]: boolean } = {}
	private observers: { [name: string]: { [_id: string]: Observer } } = {}
	private reconnectTimeout: NodeJS.Timeout | null = null

	constructor (opts?: DDPConnectorOptions) {
		super()

		opts || (opts = { host: '127.0.0.1', port: 3000, tlsOpts: {} })

		this.resetOptions(opts)
		this.ddpVersionInt = opts.ddpVersion || '1'

		// very very simple collections (name -> [{id -> document}])
		if (this.maintainCollections) {
			this.collections = {}
		}
	}

	resetOptions (opts: DDPConnectorOptions) {
		// console.log(opts)
		this.hostInt = opts.host || '127.0.0.1'
		this.portInt = opts.port || 3000
		this.pathInt = opts.path
		this.sslInt = opts.ssl || this.port === 443
		this.tlsOpts = opts.tlsOpts || {}
		this.useSockJSInt = opts.useSockJs || false
		this.autoReconnectInt = opts.autoReconnect === false ? false : true
		this.autoReconnectTimerInt = opts.autoReconnectTimer || 500
		this.maintainCollectionsInt = opts.maintainCollections || true
		this.urlInt = opts.url
		this.ddpVersionInt = opts.ddpVersion || '1'
	}

	private prepareHandlers (): void {

		this.socket.on('open', () => {
			// just go ahead and open the connection on connect
			this.send({
				msg : 'connect',
				version : this.ddpVersion,
				support : DDPClient.supportedDdpVersions
			})
		})

		this.socket.on('error', (error: Error) => {
			// error received before connection was established
			if (this.isConnecting) {
				this.emit('failed', error.message)
			}

			this.emit('socket-error', error)
		})

		this.socket.on('close', (event) => {
			this.emit('socket-close', event.code, event.reason)
			this.endPendingMethodCalls()
			this.recoverNetworkError()
		})

		this.socket.on('message', (event) => {
			this.message(event.data)
			this.emit('message', event.data)
		})
	}

	private clearReconnectTimeout (): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout)
			this.reconnectTimeout = null
		}
	}

	private recoverNetworkError (err?: any): void {
		// console.log('autoReconnect', this.autoReconnect, 'connectionFailed', this.connectionFailed, 'isClosing', this.isClosing)
		if (this.autoReconnect && !this.connectionFailed && !this.isClosing) {
			this.clearReconnectTimeout()
			this.reconnectTimeout = setTimeout(() => { this.connect() }, this.autoReconnectTimer)
			this.isReconnecting = true
		} else {
			if (err) {
				throw err
			}
		}
	}

	///////////////////////////////////////////////////////////////////////////
	// RAW, low level functions
	private send (data: AnyMessage): void {
		if (data.msg !== 'connect' && this.isConnecting) {
			this.endPendingMethodCalls()
		} else {
			this.socket.send(
				EJSON.stringify(data)
			)
		}
	}

	private failed (data: Failed): void {
		if (DDPClient.supportedDdpVersions.indexOf(data.version) !== -1) {
			this.ddpVersionInt = (data.version as '1' | 'pre2' | 'pre1')
			this.connect()
		} else {
			this.autoReconnectInt = false
			this.emit('failed', 'Cannot negotiate DDP version')
		}
	}

	private connected (data: Connected): void {
		this.session = data.session
		this.isConnecting = false
		this.isReconnecting = false
		this.emit('connected')
	}

	private result (data: Result): void {
		// console.log('Received result', data, this.callbacks, this.callbacks[data.id])
		const cb = this.callbacks[data.id] || undefined

		if (cb) {
			cb(data.error, data.result)
			data.id && (delete this.callbacks[data.id])
		}
	}

	private updated (data: Updated): void {
		if (data.methods) {
			data.methods.forEach(method => {
				const cb = this.updatedCallbacks[method]
				if (cb) {
					cb()
					delete this.updatedCallbacks[method]
				}
			})
		}
	}

	private nosub (data: NoSub): void {
		const cb = data.id && this.callbacks[data.id] || undefined

		if (cb) {
			cb(data.error)
			data.id && (delete this.callbacks[data.id])
		}
	}

	private added (data: Added): void {
		// console.log('Received added', data, this.maintainCollections)
		if (this.maintainCollections) {
			const name = data.collection
			const id = data.id || 'unknown'

			if (!this.collections[name]) {
				this.collections[name] = {}
			}
			if (!this.collections[name][id]) {
				this.collections[name][id] = { _id: id }
			}

			if (data.fields) {
				Object.entries(data.fields).forEach(([key, value]) => {
					this.collections[name][id][key] = value
				})
			}

			if (this.observers[name]) {
				Object.values(this.observers[name]).forEach(ob => ob.added(id, data.fields))
			}
		}
	}

	private removed (data: Removed): void {
		if (this.maintainCollections) {
			const name = data.collection
			const id = data.id || 'unknown'

			if (!this.collections[name][id]) {
				return
			}

			let oldValue = this.collections[name][id]

			delete this.collections[name][id]

			if (this.observers[name]) {
				Object.values(this.observers[name]).forEach(ob => ob.removed(id, oldValue))
			}
		}
	}

	private changed (data: Changed): void {
		if (this.maintainCollections) {
			const name = data.collection
			const id = data.id || 'unknown'

			if (!this.collections[name]) {
				return
			}
			if (!this.collections[name][id]) {
				return
			}

			let oldFields: { [attr: string]: unknown } = {}
			const clearedFields = data.cleared || []
			let newFields: { [attr: string]: unknown } = {}

			if (data.fields) {
				Object.entries(data.fields).forEach(([key, value]) => {
					oldFields[key] = this.collections[name][id][key]
					newFields[key] = value
					this.collections[name][id][key] = value
				})
			}

			if (data.cleared) {
				data.cleared.forEach(value => {
					delete this.collections[name][id][value]
				})
			}

			if (this.observers[name]) {
				Object.values(this.observers[name]).forEach(ob =>
					ob.changed(id, oldFields, clearedFields, newFields))
			}
		}
	}

	private ready (data: Ready): void {
		// console.log('Received ready', data, this.callbacks)
		data.subs.forEach(id => {
			const cb = this.callbacks[id]
			if (cb) {
				cb()
				delete this.callbacks[id]
			}
		})
	}

	private ping (data: Ping): void {
		this.send(
			data.id && { msg : 'pong', id : data.id } as Pong || { msg : 'pong' } as Pong
		)
	}

	private messageWork: { [name in ServerClient]: (data: Message) => void } = {
		failed: this.failed.bind(this),
		connected: this.connected.bind(this),
		result: this.result.bind(this),
		updated: this.updated.bind(this),
		nosub: this.nosub.bind(this),
		added: this.added.bind(this),
		removed: this.removed.bind(this),
		changed: this.changed.bind(this),
		ready: this.ready.bind(this),
		ping: this.ping.bind(this),
		pong: () => { /* Do nothing */ },
		error: () => { /* Do nothing */} // TODO - really do nothing!?!
	}

	// handle a message from the server
	private message (rawData: string): void {
		// console.log('Received message', rawData)
		const data: Message = EJSON.parse(rawData)

		if (this.messageWork[data.msg as ServerClient]) {
			this.messageWork[data.msg as ServerClient](data)
		}
	}

	private getNextId (): string {
		return (this.nextId += 1).toString()
	}

	private addObserver (observer: Observer): void {
		if (!this.observers[observer.name]) {
			this.observers[observer.name] = {}
		}
		this.observers[observer.name][observer.id] = observer
	}

	private removeObserver (observer: Observer): void {
		if (!this.observers[observer.name]) {
			return
		}

		delete this.observers[observer.name][observer.id]
	}

	//////////////////////////////////////////////////////////////////////////
	// USER functions -- use these to control the client

	/* open the connection to the server
	*
	*  connected(): Called when the 'connected' message is received
	*               If autoReconnect is true (default), the callback will be
	*               called each time the connection is opened.
	*/
	connect (connected?: (error?: Error, wasReconnect?: boolean) => void): void {
		this.isConnecting = true
		this.connectionFailed = false
		this.isClosing = false

		if (connected) {
			this.addListener('connected', () => {
				this.clearReconnectTimeout()

				this.isConnecting = false
				this.isReconnecting = false
				connected(undefined, this.isReconnecting)
			})
			this.addListener('failed', error => {
				this.isConnecting = false
				this.connectionFailed = true
				connected(error, this.isReconnecting)
			})
		}

		if (this.useSockJS) {
			this.makeSockJSConnection().catch(e => {
				this.emit('failed', e)
			})
		} else {
			const url = this.buildWsUrl()
			this.makeWebSocketConnection(url)
		}
	}

	private endPendingMethodCalls (): void {
		const ids = Object.keys(this.pendingMethods)
		this.pendingMethods = {}

		ids.forEach(id => {
			if (this.callbacks[id]) {
				this.callbacks[id](DDPClient.ERRORS.DISCONNECTED)
				delete this.callbacks[id]
			}

			if (this.updatedCallbacks[id]) {
				this.updatedCallbacks[id]()
				delete this.updatedCallbacks[id]
			}
		})
	}

	private async makeSockJSConnection (): Promise<void> {
		const protocol = this.ssl ? 'https://' : 'http://'
		if (this.path && !this.path?.endsWith('/')) {
			this.pathInt = this.path + '/'
		}
		const url = `${protocol}${this.host}:${this.port}/${this.path || ''}sockjs/info`

		try {
			let response = await got(url, {
				https: {
					certificateAuthority: this.tlsOpts.ca,
					key: this.tlsOpts.key,
					certificate: this.tlsOpts.cert,
					checkServerIdentity: this.tlsOpts.checkServerIdentity
				},
				responseType: 'json'
			})
			// Info object defined here(?): https://github.com/sockjs/sockjs-node/blob/master/lib/info.js
			const info = response.body as { base_url: string }
			if (!info || !info.base_url) {
				const url = this.buildWsUrl()
				this.makeWebSocketConnection(url)
			} else if (info.base_url.indexOf('http') === 0) {
				const url = info.base_url + '/websocket'
				url.replace(/^http/, 'ws')
				this.makeWebSocketConnection(url)
			} else {
				const path = info.base_url + '/websocket'
				const url = this.buildWsUrl(path)
				this.makeWebSocketConnection(url)
			}
		} catch (err) {
			this.recoverNetworkError(err)
		}
	}

	private buildWsUrl (path?: string): string {
		let url: string
		path = path || this.path || 'websocket'
		const protocol = this.ssl ? 'wss://' : 'ws://'
		if (this.url && !this.useSockJS) {
			url = this.url
		} else {
			url = `${protocol}${this.host}:${this.port}${(path.indexOf('/') === 0) ? path : '/' + path}`
		}
		return url
	}

	private makeWebSocketConnection (url: string): void {
		// console.log('About to create WebSocket client')
		this.socket = new WebSocket.Client(url, null, { tls: this.tlsOpts })
		this.prepareHandlers()
	}

	close (): void {
		this.isClosing = true
		this.socket && this.socket.close() // with mockJS connection, might not get created
		this.removeAllListeners('connected')
		this.removeAllListeners('failed')
	}

	call (
		methodName: string,
		data: Array<unknown>,
		callback: (err: Error, result: unknown) => void,
		updatedCallback?: (err: Error, result: unknown) => void
	): void {
		// console.log('Call', methodName, 'with this.isConnecting = ', this.isConnecting)
		const id = this.getNextId()

		this.callbacks[id] = (error?: DDPError, result?: unknown) => {
			delete this.pendingMethods[id]

			if (callback) {
				callback.apply(this, [error, result])
			}
		}

		const self = this
		this.updatedCallbacks[id] = function () {
			delete self.pendingMethods[id]

			if (updatedCallback) {
				updatedCallback.apply(this, arguments)
			}
		}

		this.pendingMethods[id] = true

		this.send({
			msg    : 'method',
			id     : id,
			method : methodName,
			params : data
		})
	}

	callWithRandomSeed (
		methodName: string,
		data: Array<unknown>,
		randomSeed: string,
		callback: (err?: DDPError, result?: unknown) => void,
		updatedCallback?: (err?: Error, result?: unknown) => void
	): void {
		const id = this.getNextId()

		if (callback) {
			this.callbacks[id] = callback
		}

		if (updatedCallback) {
			this.updatedCallbacks[id] = updatedCallback
		}

		this.send({
			msg        : 'method',
			id         : id,
			method     : methodName,
			randomSeed : randomSeed,
			params     : data
		})
	}

	// open a subscription on the server, callback should handle on ready and nosub
	subscribe (subscriptionName: string, data: Array<unknown>, callback: () => void): string {
		const id = this.getNextId()

		if (callback) {
			this.callbacks[id] = callback
		}

		this.send({
			msg    : 'sub',
			id     : id,
			name   : subscriptionName,
			params : data
		})

		return id
	}

	unsubscribe (subscriptionId: string): void {
		this.send({
			msg : 'unsub',
			id  : subscriptionId
		})
	}

	/**
	 * Adds an observer to a collection and returns the observer.
	 * Observation can be stopped by calling the stop() method on the observer.
	 * Functions for added, changed and removed can be added to the observer
	 * afterward.
	 */
	observe (
		collectionName: string,
		added?: () => {},
		changed?: () => {},
		removed?: () => {}
	): Observer {
		const observer: Observer = {
			id: this.getNextId(),
			name: collectionName,
			added: added || (() => { /* Do nothing */ }),
			changed: changed || (() => { /* Do nothing */ }),
			removed: removed || (() => { /* Do nothing */ }),
			stop: () => { this.removeObserver(observer) }
		}

		this.addObserver(observer)
		return observer
	}
}
