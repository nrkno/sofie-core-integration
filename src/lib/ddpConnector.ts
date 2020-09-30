import { EventEmitter } from 'events'
import { DDPClient, DDPConnectorOptions } from './ddpClient'

export class DDPConnector extends EventEmitter {
	public ddpClient: DDPClient | undefined

	private _options: DDPConnectorOptions
	private _connected: boolean = false
	private _connecting: boolean = false
	private _connectionId: string | undefined = undefined

	private ddpIsOpen: boolean = false
	private _monitorDDPConnectionInterval: any = null

	constructor (options: DDPConnectorOptions) {
		super()

		this._options = options

	}
	createClient (): Promise<void> {
		let o: DDPConnectorOptions = {
			host: 					this._options.host,
			port: 					this._options.port,
			path: 					this._options.path || '',
			ssl: 					this._options.ssl || false,
			tlsOpts: 				this._options.tlsOpts || {},
			useSockJs: 				true,
			autoReconnect: 			false, // we'll handle reconnections ourselves
			autoReconnectTimer: 	1000,
			maintainCollections: 	true,
			ddpVersion: 			'1'
		}
		let doConnect: boolean = false

		if (!this.ddpClient) {

			this.ddpClient = new DDPClient(o)
			this.ddpClient.on('socket-close', () => {

				this._onclientConnectionChange(false)

			})
			this.ddpClient.on('message', (message: any) => this._onClientMessage(message))
			this.ddpClient.on('socket-error', (error: any) => this._onClientError(error))
			this.ddpClient.on('info', (message: any) => this._onClientInfo(message))
		} else {

			if (this.ddpClient.socket) {
				this.ddpClient.close()
			}

			this.ddpClient.resetOptions(o)
			doConnect = true
		}
		this._setupDDPEvents()

		if (doConnect) {
			return new Promise((resolve, reject) => {
				this.ddpClient && this.ddpClient.connect((err) => {
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

					if (this.ddpClient.socket) {
						this.ddpClient.close()
					}
					this._setupDDPEvents()
					this._connecting = true
					console.log('About to call connect')
					this.ddpClient.connect((error?: Error/*, isReconnecting: boolean*/) => {
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
	private _setupDDPEvents () {
		this.ddpClient && this.ddpClient.on('connected', () => this._onclientConnectionChange(true))
		this.ddpClient && this.ddpClient.on('failed', (error: any) => this._onClientConnectionFailed(error))
	}
	private _monitorDDPConnection (): void {

		if (this._monitorDDPConnectionInterval) clearInterval(this._monitorDDPConnectionInterval)

		this._monitorDDPConnectionInterval = setInterval(() => {

			if (this.ddpClient && !this.connected && this.ddpIsOpen && this._options.autoReconnect !== false) {
				// Time to reconnect
				this.createClient()
				.catch(e => {
					this.emit('error', e)
				})
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
				this._connectionId = this.ddpClient && this.ddpClient.session
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
	private _onClientInfo (message: any) {
		this.emit('info', message)
	}
}
