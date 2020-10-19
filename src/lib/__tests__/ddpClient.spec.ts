import { DDPClient, DDPConnectorOptions } from '../../index'
jest.mock('faye-websocket')

let wait = async (t: number): Promise<void> => new Promise((resolve) => {
	setTimeout(resolve, t)
})

it('Creates a DDP client without options', () => {
	let ddp = new DDPClient()
	expect(ddp).toBeTruthy()
})

it('Creates a DDP Client with options', () => {
	let ddp = new DDPClient({
		host: '127.0.0.99',
		port: 3210
	} as DDPConnectorOptions)
	expect(ddp).toBeTruthy()
	expect(ddp.port).toBe(3210)
	expect(ddp.host).toBe('127.0.0.99')
})

it('Connects to mock server', async () => {
	let connected = jest.fn()
	let ddp = new DDPClient()
	ddp.on('connected', connected)
	ddp.connect()

	await wait(10)
	expect(connected).toHaveBeenCalled()
	ddp.close()
})
