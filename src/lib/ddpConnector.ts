let DDP = require('ddp')

import { EventEmitter } from 'events'

export interface DDPConnectorOptions {
	host: string
	port: number
	path?: string
	ssl?: boolean
	debug?:	boolean
	autoReconnect?: boolean // default: true
	autoReconnectTimer?: number
}
export interface Observer {
	added: (id: string) => void
	changed: (id: string, oldFields: any, clearedFields: any, newFields: any) => void
	removed: (id: string, oldValue: any) => void
	stop: () => void
}
export interface DDPClient {
	on: (event: string, data?: any) => void,
	close: () => void,
	connect: (callback?: (error: Error, wasReconnect: boolean) => void) => void,

	call: (methodName: string, data: Array<any>, callback: (err: Error, result: any) => void) => void
	subscribe: (subscriptionName: string, data: Array<any>, callback: () => void) => string
	unsubscribe: (subscriptionId: string) => void
	observe: (collectionName: string) => Observer

	collections: {
		[collectionName: string]: {
			[id: string]: {
				_id: string,
				[attr: string]: any
			}
		}
	}

	socket: any,
	session: string,

	host: string,
	port: number,
	path: string,
	ssl: boolean,
	useSockJS: boolean
	autoReconnect: boolean
	autoReconnectTimer:	number
	ddpVersion:	any
}

export class DDPConnector extends EventEmitter {
	public ddpClient: DDPClient

	private _options: DDPConnectorOptions
	private _connected: boolean = false
	private _connecting: boolean = false
	private _connectionId: string

	private ddpIsOpen: boolean = false
	private _monitorDDPConnectionInterval: any = null

	constructor (options: DDPConnectorOptions) {
		super()

		this._options = options

	}
	createClient (): Promise<void> {
		let o = {
			host: 					this._options.host,
			port: 					this._options.port,
			path: 					this._options.path || '',
			ssl: 					this._options.ssl || false,
			useSockJS: 				true,
			autoReconnect: 			false, // we'll handle reconnections ourselves
			autoReconnectTimer: 	1000,
			maintain_collections: 	true,
			ddpVersion: 			'1'
		}
		let doConnect: boolean = false

		if (!this.ddpClient) {

			this.ddpClient = new DDP(o)
			this.ddpClient.on('socket-close', () => {

				this._onclientConnectionChange(false)

			})
			this.ddpClient.on('message', (message: any) => this._onClientMessage(message))
			this.ddpClient.on('socket-error', (error: any) => this._onClientError(error))

		} else {

			if (this.ddpClient.socket) {
				this.ddpClient.close()
			}

			this.ddpClient.host = o.host
			this.ddpClient.port = o.port
			this.ddpClient.path = o.path
			this.ddpClient.ssl 	= o.ssl
			this.ddpClient.useSockJS 			= o.useSockJS
			this.ddpClient.autoReconnect 		= o.autoReconnect
			this.ddpClient.autoReconnectTimer	= o.autoReconnectTimer
			this.ddpClient.ddpVersion			= o.ddpVersion

			doConnect = true
		}

		this.ddpClient.on('connected', () => {

			this._onclientConnectionChange(true)
		})
		this.ddpClient.on('failed', (error: any) => this._onClientConnectionFailed(error))

		if (doConnect) {
			return new Promise((resolve, reject) => {
				this.ddpClient.connect((err) => {
					// connected
					if (err) reject(err)
					else resolve()
				})
			})
		} else {
			return Promise.resolve()
		}
	}
	public connect (): Promise<void> {

		return (
			!this.ddpClient ?
			this.createClient() :
			Promise.resolve()
		).then(() => {

			return new Promise((resolve, reject) => {

				if (this.ddpClient && !this._connecting) {

					this._connecting = true

					this.ddpClient.connect((error: Object/*, isReconnecting: boolean*/) => {
						this._connecting = false

						if (error) {
							reject(error)
						} else {
							this._connected = true
							resolve()
							this.ddpIsOpen = true
							this._monitorDDPConnection()
						}
					})
				}
			})
		})
		.then(() => {
			return
		})
	}
	public close () {
		this.ddpIsOpen = false
		if (this.ddpClient) {
			this.ddpClient.close()
			delete this.ddpClient
		}
		this._onclientConnectionChange(false)
	}
	public get connected (): boolean {
		return this._connected
	}
	public forceReconnect (): Promise<void> {
		return this.createClient()
	}
	public get connectionId () {
		return this._connectionId
	}
	private _monitorDDPConnection (): void {

		if (this._monitorDDPConnectionInterval) clearInterval(this._monitorDDPConnectionInterval)

		this._monitorDDPConnectionInterval = setInterval(() => {

			if (this.ddpClient && !this.connected && this.ddpIsOpen && this._options.autoReconnect !== false) {
				// reconnect:
				this.ddpClient.connect()

			} else {
				// stop monitoring:
				if (this._monitorDDPConnectionInterval) clearInterval(this._monitorDDPConnectionInterval)
			}
		},this._options.autoReconnectTimer || 1000)
	}

	private _onclientConnectionChange (connected: boolean) {
		if (connected !== this._connected) {
			this._connected = connected

			if (connected) {
				this._connectionId = this.ddpClient.session
			}

			// log.debug("DDP: _onclientConnectionChange "+connected);
			this.emit('connectionChanged', this._connected)
			if (this._connected) this.emit('connected')
			else this.emit('disconnected')

			if (!this._connected) this._monitorDDPConnection()

		}
	}
	private _onClientConnectionFailed (error: Error) {

		if (this.listenerCount('failed') > 0) {

			this.emit('failed', error)
		} else {
			console.log('Failed',error)
		}
		this._monitorDDPConnection()
	}
	private _onClientMessage (message: any) {
		// message
		this.emit('message', message)
	}
	private _onClientError (error: Error) {
		this.emit('error', error)
		this._monitorDDPConnection()
	}
}
