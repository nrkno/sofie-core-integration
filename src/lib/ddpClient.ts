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
	added: (id: string) => void
	changed: (id: string, oldFields: any, clearedFields: any, newFields: any) => void
	removed: (id: string, oldValue: any) => void
	stop: () => void
}

export class DDPClient extends EventEmitter {

	public collections: {
		[collectionName: string]: {
			[id: string]: {
				_id: string,
				[attr: string]: any
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
	public readonly autoReconnect: boolean
	public readonly autoReconnectTimer: number
	public readonly ddpVersion: '1' | 'pre2' | 'pre1'
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
	private nextId: number = 0
	private callbacks: { [name: string]: Function } = {}
	private updatedCallbacks: { [name: string]: Function } = {}
	private pendingMethods = {}
	private observers: { [name: string]: Function } = {} 

	constructor(opts?: DDPConnectorOptions) { 
		super()

		opts || (opts = { host: '127.0.0.1', port: 3000 })

		this.host = opts.host || "127.0.0.1"
		this.port = opts.port || 3000
		this.path = opts.path
		this.ssl  = opts.ssl  || this.port === 443
		this.tlsOpts = opts.tlsOpts || {}
		this.useSockJS = opts.useSockJs || false
		this.autoReconnect = opts.autoReconnect || true
		this.autoReconnectTimer = opts.autoReconnectTimer || 500
		this.maintainCollections = opts.maintainCollections || true
		this.url = opts.url 
		this.ddpVersion = opts.ddpVersion || '1'

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
				this.emit('failed', error.message);
			}

			this.emit('socket-error', error);
		})

		this.socket.on('close', (event) => {
			this.emit('socket-close', event.code, event.reason);
			this.endPendingMethodCalls();
			this.recoverNetworkError();
		});

		this.socket.on('message', (event) => {
			this.message(event.data)
			this.emit('message', event.data)
		})
	}

	private _clearReconnectTimeout (): void {
		var self = this;
		if (self.reconnectTimeout) {
			clearTimeout(self.reconnectTimeout);
			self.reconnectTimeout = null;
		}
	};

	private _recoverNetworkError(): void {
		var self = this;
		if (self.autoReconnect && ! self._connectionFailed && ! self._isClosing) {
			self._clearReconnectTimeout();
			self.reconnectTimeout = setTimeout(function() { self.connect(); }, self.autoReconnectTimer);
			self._isReconnecting = true;
		}
	}

	///////////////////////////////////////////////////////////////////////////
	// RAW, low level functions
	private _send (data: DDPData): void {
		if (data.msg !== 'connect' && this._isConnecting) {
			this._endPendingMethodCalls()
		} else {
			this.socket.send(
				EJSON.stringify(data)
			);
		}
	};

	// handle a message from the server
	private _message (data: DDPData): void {
		var self = this;

		data = EJSON.parse(data);

		// TODO: 'addedBefore' -- not yet implemented in Meteor
		// TODO: 'movedBefore' -- not yet implemented in Meteor

		if (!data.msg) {
			return;

		} else if (data.msg === "failed") {
			if (self.supportedDdpVersions.indexOf(data.version) !== -1) {
				this.ddpVersion = data.version;
				self.connect();
			} else {
				self.autoReconnect = false;
				self.emit("failed", "Cannot negotiate DDP version");
			}

		} else if (data.msg === "connected") {
			self.session = data.session;
			self.emit("connected");

		// method result
		} else if (data.msg === "result") {
			var cb = self._callbacks[data.id];

			if (cb) {
				cb(data.error, data.result);
				delete self._callbacks[data.id];
			}

		// method updated
		} else if (data.msg === "updated") {

			_.each(data.methods, function (method) {
				var cb = self._updatedCallbacks[method];
				if (cb) {
					cb();
					delete self._updatedCallbacks[method];
				}
			});

		// missing subscription
		} else if (data.msg === "nosub") {
			var cb = self._callbacks[data.id];

			if (cb) {
				cb(data.error);
				delete self._callbacks[data.id];
			}

		// add document to collection
		} else if (data.msg === "added") {
			if (self.maintainCollections && data.collection) {
				var name = data.collection, id = data.id;

				if (! self.collections[name])     { self.collections[name] = {}; }
				if (! self.collections[name][id]) { self.collections[name][id] = {}; }

				self.collections[name][id]._id = id;

				if (data.fields) {
					_.each(data.fields, function(value, key) {
						self.collections[name][id][key] = value;
					});
				}

				if (self._observers[name]) {
					_.each(self._observers[name], function(observer) {
						observer.added(id, data.fields);
					});
				}
			}

		// remove document from collection
		} else if (data.msg === "removed") {
			if (self.maintainCollections && data.collection) {
				var name = data.collection, id = data.id;

				if (! self.collections[name][id]) {
					return;
				}

				var oldValue = self.collections[name][id];

				delete self.collections[name][id];

				if (self._observers[name]) {
					_.each(self._observers[name], function(observer) {
						observer.removed(id, oldValue);
					});
				}
			}

		// change document in collection
		} else if (data.msg === "changed") {
			if (self.maintainCollections && data.collection) {
				var name = data.collection, id = data.id;

				if (! self.collections[name])     { return; }
				if (! self.collections[name][id]) { return; }

				var oldFields     = {},
						clearedFields = data.cleared || [],
						newFields = {};

				if (data.fields) {
					_.each(data.fields, function(value, key) {
							oldFields[key] = self.collections[name][id][key];
							newFields[key] = value;
							self.collections[name][id][key] = value;
					});
				}

				if (data.cleared) {
					_.each(data.cleared, function(value) {
							delete self.collections[name][id][value];
					});
				}

				if (self._observers[name]) {
					_.each(self._observers[name], function(observer) {
						observer.changed(id, oldFields, clearedFields, newFields);
					});
				}
			}

		// subscriptions ready
		} else if (data.msg === "ready") {
			_.each(data.subs, function(id) {
				var cb = self._callbacks[id];
				if (cb) {
					cb();
					delete self._callbacks[id];
				}
			});

		// minimal heartbeat response for ddp pre2
		} else if (data.msg === "ping") {
			self._send(
				_.has(data, "id") ? { msg : "pong", id : data.id } : { msg : "pong" }
			);
		}
	}


	private _getNextId (): void {
		return (this._nextId += 1).toString();
	}


	private _addObserver (observer: Observer): void {
		if (! this._observers[observer.name]) {
			this._observers[observer.name] = {};
		}
		this._observers[observer.name][observer._id] = observer;
	}

	private _removeObserver (observer: Observer): void {
		if (! this._observers[observer.name]) { return; }

		delete this._observers[observer.name][observer._id];
	};

	//////////////////////////////////////////////////////////////////////////
	// USER functions -- use these to control the client

	/* open the connection to the server
	*
	*  connected(): Called when the 'connected' message is received
	*               If autoReconnect is true (default), the callback will be
	*               called each time the connection is opened.
	*/
	connect (callback?: (error: Error, wasReconnect: boolean) => void): void {
		var self = this;
		self._isConnecting = true;
		self._connectionFailed = false;
		self._isClosing = false;

		if (connected) {
			self.addListener("connected", function() {
				self._clearReconnectTimeout();

				connected(undefined, self._isReconnecting);
				self._isConnecting = false;
				self._isReconnecting = false;
			});
			self.addListener("failed", function(error) {
				self._isConnecting = false;
				self._connectionFailed = true;
				connected(error, self._isReconnecting);
			});
		}

		if (self.useSockJs) {
			self._makeSockJSConnection();
		} else {
			var url = self._buildWsUrl();
			self._makeWebSocketConnection(url);
		}
	};

	private _endPendingMethodCalls (): void {
		var self = this;
		var ids = _.keys(self._pendingMethods);
		self._pendingMethods = {};

		ids.forEach(function (id) {
			if (self._callbacks[id]) {
				self._callbacks[id](DDPClient.ERRORS.DISCONNECTED);
				delete self._callbacks[id];
			}

			if (self._updatedCallbacks[id]) {
				self._updatedCallbacks[id]();
				delete self._updatedCallbacks[id];
			}
		});
	};

	private _makeSockJSConnection (): void {
		var self = this;

		// do the info hit
		var protocol = self.ssl ? "https://" : "http://";
		var randomValue = "" + Math.ceil(Math.random() * 9999999);
		var path = pathJoin("/", self.path || "", "sockjs/info");
		var url = protocol + self.host + ":" + self.port + path;

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

	private _buildWsUrl (path: string): string {
		var self = this;
		var url;
		path = path || self.path || "websocket";
		var protocol = self.ssl ? "wss://" : "ws://";
		if (self.url && !self.useSockJs) {
			url = self.url;
		} else {
			url = protocol + self.host + ":" + self.port;
			url += (path.indexOf("/") === 0)? path : "/" + path;
		}
		return url;
	};

	private _makeWebSocketConnection (url: string): void {
		var self = this;
		self.socket = new WebSocket.Client(url, null, self.tlsOpts);
		self._prepareHandlers();
	}

	close (): void {
		var self = this;
		self._isClosing = true;
		self.socket.close();
		self.removeAllListeners("connected");
		self.removeAllListeners("failed");
	};

	call (
		methodName: string, 
		data: Array<any>, 
		callback: (err: Error, result: any) => void, 
		updatedCallback?: (err: Error, result: any) => void
	): void {
		var self = this;
		var id = self._getNextId();

		self._callbacks[id] = function () {
			delete self._pendingMethods[id];

			if (callback) {
				callback.apply(this, arguments);
			}
		};

		self._updatedCallbacks[id] = function () {
			delete self._pendingMethods[id];

			if (updatedCallback) {
				updatedCallback.apply(this, arguments);
			}
		};

		self._pendingMethods[id] = true;

		self._send({
			msg    : "method",
			id     : id,
			method : name,
			params : params
		});
	};


	callWithRandomSeed (
		methodName: string, 
		data: Array<any>, 
		randomSeed: string,
		callback: (err: Error, result: any) => void, 
		updatedCallback?: (err: Error, result: any) => void
	): void {
		var id = self._getNextId();

		if (callback) {
			self._callbacks[id] = callback;
		}

		if (updatedCallback) {
			self._updatedCallbacks[id] = updatedCallback;
		}

		self._send({
			msg        : "method",
			id         : id,
			method     : name,
			randomSeed : randomSeed,
			params     : params
		});
	}

	// open a subscription on the server, callback should handle on ready and nosub
	subscribe (subscriptionName: string, data: Array<any>, callback: () => void): string {
		var self = this;
		var id = self._getNextId();

		if (callback) {
			self._callbacks[id] = callback;
		}

		self._send({
			msg    : "sub",
			id     : id,
			name   : name,
			params : params
		});

		return id;
	};

	unsubscribe (subscriptionId: string): void {
		var self = this;

		self._send({
			msg : "unsub",
			id  : id
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
		added: () => {},
		changed: () => {},
		removed: () => {}
	): Observer {
		var self = this;
		var observer = {};
		var id = self._getNextId();

		// name, _id are immutable
		Object.defineProperty(observer, "name", {
			get: function() { return name; },
			enumerable: true
		});

		Object.defineProperty(observer, "_id", { get: function() { return id; }});

		observer.added   = added   || function(){};
		observer.changed = changed || function(){};
		observer.removed = removed || function(){};

		observer.stop = function() {
			self._removeObserver(observer);
		};

		self._addObserver(observer);

		return observer;
	};
}