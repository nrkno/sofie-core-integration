/**
 * DDP client. Based on:
 * 
 * * https://github.com/nytamin/node-ddp-client
 * * https://github.com/oortcloud/node-ddp-client
 * 
 * Brought into this project for maintenance reasons and converted to Typescript.
 */

import * as WebSocket from 'faye-websocket'
import * as EJSON from 'ejson'
import { EventEmitter } from 'events'
import { join as pathJoin } from 'path'

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

export interface Observer {
	readonly name: string
	readonly _id: string
	added: (id: string, fields?: { [attr: string]: unknown } ) => void
	changed: (id: string, oldFields: { [attr: string]: unknown }, clearedFields: Array<string>, newFields: { [attr: string]: unknown }) => void
	removed: (id: string, oldValue: { [attr: string]: unknown }) => void
	stop: () => void
}

type ClientServer = 'connect' | 'ping' | 'pong' | 'method' | 'sub' | 'unsub'
type ServerClient = 'failed' | 'connected' | 'result' | 'updated' | 'nosub' | 'added' | 'removed' | 'changed' | 'ready' | 'ping' | 'pong' | 'error'
type MessageType = ClientServer | ServerClient

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
export interface Connect extends Message {
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
export interface Connected extends Message {
	msg: 'connected'
	/** An identifier for the DDP session */
	session: string
}

/**
 * Response message when a client's connection request was unsuccessful. 
 */
export interface Failed extends Message {
	msg: 'failed'
	/** A suggested protocol version to connect with */
	version: string
}

/**
 * Heartbeat request message. Can be sent from server to client or client to server.
 */
export interface Ping extends Message {
	msg: 'ping'
	/** Identifier used to correlate with response */
	id?: string
}

/**
 * Heartbeat response message.
 */

export interface Pong extends Message {
	msg: 'pong'
	/** Same as received in the `ping` message */
	id?: string
}

/**
 * Message from the client specifying the sets of information it is interested in.
 * The server should then send `added`, `changed` and `removed` messages matching
 * the subscribed types.
 */
export interface Sub extends Message {
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
export interface UnSub extends Message {
	msg: 'unsub'
	/** The `id` passed to `sub` */
	id: string
}

/**
 * Error raised related to a subscription.
 */
export interface NoSub extends Message {
	msg: 'nosub'
	/** The `id` passed to `sub` */
	id: string
	/** An error raised by the subscription as it concludes, or sub-not-found */
	error?: DDPError 
}

/**
 * Notification that a document has been added to a collection.
 */
export interface Added extends Message {
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
export interface Changed extends Message {
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
export interface Removed extends Message {
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
export interface Ready extends Message {
	msg: 'ready'
	/** Identifiers passed to `sub` which have sent their initial batch of data */
	subs: Array<string>
}

/**
 * Remote procedure call request request.
 */
export interface Method extends Message {
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
export interface Result extends Message {
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
export interface Updated extends Message {
	msg: 'updated'
	/** Identifiers passed to `method`, all of whose writes have been reflected in data messages */
	methods: Array<string>
}

/**
 * Erroneous messages sent from the client to the server can result in receiving a top-level 
 * `error` message in response.
 */
export interface ErrorMessage extends Message {
	msg: 'error'
	/** Description of the error */
	reason: string
	/** If the original message parsed properly, it is included here */
	offendingMessage?: Message 
}

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

	public readonly host: string
	public readonly port: number
	public readonly path?: string
	public readonly ssl: boolean
	public readonly useSockJS: boolean
	private autoReconnectInt: boolean
	public get autoReconnect() { return this.autoReconnectInt }
	public readonly autoReconnectTimer: number
	private ddpVersionInt: '1' | 'pre2' | 'pre1'
	public get ddpVersion () { return this.ddpVersionInt }	
	public readonly url: string | undefined
	public readonly maintainCollections: boolean

	public static readonly ERRORS = {
		DISCONNECTED: new Error("DDPClient: Disconnected from DDP server")
	}
	public static readonly supportedDdpVersions = [ '1', 'pre2', 'pre1']
	public static EJSON = EJSON

	private tlsOpts: TLSOpts
	private isConnecting: boolean = false
	private isReconnecting: boolean = false
	private isClosing: boolean = false
	private connectionFailed: boolean = false
	private nextId: number = 0
	private callbacks: { [id: string]: (error?: DDPError, result?: unknown) => void } = {}
	private updatedCallbacks: { [name: string]: Function } = {}
	private pendingMethods: { [id: string] : boolean } = {}
	private observers: { [name: string]: { [_id: string]: Observer } } = {} 
	private reconnectTimeout: NodeJS.Timeout | null = null

	constructor(opts?: DDPConnectorOptions) { 
		super()

		opts || (opts = { host: '127.0.0.1', port: 3000 })

		this.host = opts.host || "127.0.0.1"
		this.port = opts.port || 3000
		this.path = opts.path
		this.ssl  = opts.ssl  || this.port === 443
		this.tlsOpts = opts.tlsOpts || {}
		this.useSockJS = opts.useSockJs || false
		this.autoReconnectInt = opts.autoReconnect || true
		this.autoReconnectTimer = opts.autoReconnectTimer || 500
		this.maintainCollections = opts.maintainCollections || true
		this.url = opts.url 
		this.ddpVersionInt = opts.ddpVersion || '1'

		// very very simple collections (name -> [{id -> document}])
		if (this.maintainCollections) {
				this.collections = {};
		}
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
			this.emit('socket-close', event.code, event.reason);
			this.endPendingMethodCalls()
			this.recoverNetworkError()
		});

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
	};

	private recoverNetworkError(): void {
		if (this.autoReconnect && !this.connectionFailed && !this.isClosing) {
			this.clearReconnectTimeout();
			this.reconnectTimeout = setTimeout(() => { this.connect() }, this.autoReconnectTimer);
			this.isReconnecting = true;
		}
	}

	///////////////////////////////////////////////////////////////////////////
	// RAW, low level functions
	private send <M extends Message> (data: M): void {
		if (data.msg !== 'connect' && this.isConnecting) {
			this.endPendingMethodCalls()
		} else {
			this.socket.send(
				EJSON.stringify(data)
			);
		}
	};

	private failed (data: Failed): void {
		if (DDPClient.supportedDdpVersions.indexOf(data.version) !== -1) {
			this.ddpVersionInt = <'1' | 'pre2' | 'pre1'> data.version
			this.connect()
		} else {
			this.autoReconnectInt = false
			this.emit('failed', 'Cannot negotiate DDP version')
		}
	}

	private connected (data: Connected): void {
		this.session = data.session
		this.emit('connected')
	}

	private result (data: Result): void {
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

			if (this.observers[name] && this.observers[name][id]) {
				this.observers[name][id].added(id, data.fields)
			}
		}
	}

	private removed (data: Removed): void {
		if (this.maintainCollections) {
			const name = data.collection 
			const id = data.id || 'unknown';

			if (!this.collections[name][id]) {
				return;
			}

			var oldValue = this.collections[name][id];

			delete this.collections[name][id];

			if (this.observers[name] && this.observers[name][id]) {
				this.observers[name][id].removed(id, oldValue)
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
			let newFields: { [attr: string]: unknown } = {};

			if (data.fields) {
				Object.entries(data.fields).forEach(([key, value]) => {
					oldFields[key] = this.collections[name][id][key];
					newFields[key] = value;
					this.collections[name][id][key] = value
				})
			}

			if (data.cleared) {
				data.cleared.forEach(value => {
					delete this.collections[name][id][value];
				})
			}

			if (this.observers[name] && this.observers[name][id]) {
				this.observers[name][id].changed(id, oldFields, clearedFields, newFields)
			}
		}
	}

	private ready (data: Ready): void {
		data.subs.forEach(id => {
			const cb = this.callbacks[id];
			if (cb) {
				cb()
				delete this.callbacks[id];
			}
		})
	}

	private ping (data: Ping): void {
		this.send(
			data.id && { msg : "pong", id : data.id } as Pong || { msg : "pong" } as Pong
		);
	}

	private messageWork: { [name in ServerClient]: (data: Message) => void } = {
		failed: this.failed,
		connected: this.connected,
		result: this.result,
		updated: this.updated,
		nosub: this.nosub,
		added: this.added,
		removed: this.removed,
		changed: this.changed,
		ready: this.ready,
		ping: this.ping,
		pong: () => {},
		error: () => {}
	}

	// handle a message from the server
	private message (rawData: string): void {
		const data: Message = EJSON.parse(rawData)

		if (this.messageWork[<ServerClient> data.msg]) {
			this.messageWork[<ServerClient> data.msg](data)
		}
	}

	private getNextId (): string {
		return (this.nextId += 1).toString();
	}

	private addObserver (observer: Observer): void {
		if (!this.observers[observer.name]) {
			this.observers[observer.name] = {}
		}
		this.observers[observer.name][observer._id] = observer
	}

	private removeObserver (observer: Observer): void {
		if (!this.observers[observer.name]) { 
			return
		}

		delete this.observers[observer.name][observer._id]
	};

	//////////////////////////////////////////////////////////////////////////
	// USER functions -- use these to control the client

	/* open the connection to the server
	*
	*  connected(): Called when the 'connected' message is received
	*               If autoReconnect is true (default), the callback will be
	*               called each time the connection is opened.
	*/
	connect (connected?: (error?: Error, wasReconnect?: boolean) => void): void {
		this.isConnecting = true;
		this.connectionFailed = false;
		this.isClosing = false;

		if (connected) {
			this.addListener('connected', () => {
				this.clearReconnectTimeout()

				connected(undefined, this.isReconnecting)
				this.isConnecting = false
				this.isReconnecting = false
			})
			this.addListener('failed', error => {
				this.isConnecting = false
				this.connectionFailed = true
				connected(error, this.isReconnecting)
			})
		}

		if (this.useSockJS) {
			this.makeSockJSConnection()
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
		});
	};

	private makeSockJSConnection (): void {
		// do the info hit
		const protocol = this.ssl ? "https://" : "http://"
		const randomValue = `${Math.ceil(Math.random() * 9999999)}`
		const path = pathJoin("/", this.path || "", "sockjs/info");
		const url = protocol + this.host + ":" + this.port + path;

		var requestOpts = { 'url': url, 'agentOptions': self.tlsOpts };

		request.get(requestOpts, function(err, res, body) {
			if (err) {
				self._recoverNetworkError();
			} else if (body) {
				var info;
				try {
					info = JSON.parse(body);
				} catch (e) {
					console.error(e);
				}
				if (!info || !info.base_url) {
					// no base_url, then use pure WS handling
					var url = self._buildWsUrl();
					self._makeWebSocketConnection(url);
				} else if (info.base_url.indexOf("http") === 0) {
					// base url for a different host
					var url = info.base_url + "/websocket";
					url = url.replace(/^http/, "ws");
					self._makeWebSocketConnection(url);
				} else {
					// base url for the same host
					var path = info.base_url + "/websocket";
					var url = self._buildWsUrl(path);
					self._makeWebSocketConnection(url);
				}
			} else {
				// no body. weird. use pure WS handling
				var url = self._buildWsUrl();
				self._makeWebSocketConnection(url);
			}
		});
	}

	private buildWsUrl (path?: string): string {
		let url : string
		path = path || this.path || "websocket";
		const protocol = this.ssl ? "wss://" : "ws://";
		if (this.url && !this.useSockJS) {
			url = this.url;
		} else {
			url = `${protocol}${this.host}:${this.port}${(path.indexOf('/') === 0)? path : "/" + path}`
		}
		return url;
	};

	private makeWebSocketConnection (url: string): void {
		this.socket = new WebSocket.Client(url, null, { tls: this.tlsOpts })
		this.prepareHandlers();
	}

	close (): void {
		this.isClosing = true;
		this.socket.close();
		this.removeAllListeners('connected')
		this.removeAllListeners('failed')
	};

	call (
		methodName: string, 
		data: Array<unknown>, 
		callback: (err: Error, result: unknown) => void, 
		updatedCallback?: (err: Error, result: unknown) => void
	): void {
		const id = this.getNextId()

		this.callbacks[id] = () => {
			delete this.pendingMethods[id]

			if (callback) {
				callback.apply(this, arguments);
			}
		}

		this.updatedCallbacks[id] =() => {
			delete this.pendingMethods[id]

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
		});
	};

	callWithRandomSeed (
		methodName: string, 
		data: Array<unknown>, 
		randomSeed: string,
		callback: (err?: Error, result?: unknown) => void, 
		updatedCallback?: (err?: Error, result?: unknown) => void
	): void {
		const id = this.getNextId()

		if (callback) {
			this.callbacks[id] = callback
		}

		if (updatedCallback) {
			this.updatedCallbacks[id] = updatedCallback;
		}

		this.send({
			msg        : 'method',
			id         : id,
			method     : methodName,
			randomSeed : randomSeed,
			params     : data
		});
	}

	// open a subscription on the server, callback should handle on ready and nosub
	subscribe (subscriptionName: string, data: Array<unknown>, callback: () => void): string {
		const id = this.getNextId()

		if (callback) {
			this.callbacks[id] = callback;
		}

		this.send({
			msg    : 'sub',
			id     : id,
			name   : subscriptionName,
			params : data
		});

		return id;
	};

	unsubscribe (subscriptionId: string): void {
		this.send({
			msg : 'unsub',
			id  : subscriptionId
		});
	};

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
			_id: this.getNextId(),
			name: collectionName,
			added: added || (() => {}),
			changed: changed || (() => {}),
			removed: removed || (() => {}),
			stop: () => { this.removeObserver(observer) }
		}

		this.addObserver(observer)
		return observer
	}
}