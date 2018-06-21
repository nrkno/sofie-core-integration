
import { CoreConnection } from '../index'
import { PeripheralDeviceAPI as P } from '../lib/corePeripherals'

function wait (time: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve()
		}, time)
	})
}
let hostOptions = {
	host: '127.0.0.1',
	port: 3010
}
describe('Integration', () => {
	let core: CoreConnection

	let onConnectionChanged = jest.fn()
	let onConnected = jest.fn()
	let onDisconnected = jest.fn()

	beforeEach(() => {
		core = new CoreConnection({
			deviceId: 'JestTest',
			deviceToken: 'abcd',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework'
		})

		onConnectionChanged.mockClear()
		onConnected.mockClear()
		onDisconnected.mockClear()

		core.onConnectionChanged(onConnectionChanged)
		core.onConnected(onConnected)
		core.onDisconnected(onDisconnected)

		expect(core.connected).toEqual(false)
	})
	afterEach(async () => {
		//
		await core.destroy()
	})
	test.only('Test connection and basic Core functionality', async () => {
		// Initiate connection to Core:
		console.log('init')
		let id = await core.init(hostOptions)

		expect(core.connected).toEqual(true)
		expect(id).toEqual(core.deviceId)

		expect(onConnectionChanged).toHaveBeenCalledTimes(1)
		expect(onConnectionChanged.mock.calls[0][0]).toEqual(true)
		expect(onConnected).toHaveBeenCalledTimes(1)
		expect(onDisconnected).toHaveBeenCalledTimes(0)

		console.log('statuses')
		// Set some statuses:

		let statusResponse = await core.setStatus({
			statusCode: P.StatusCode.WARNING_MAJOR,
			messages: ['testing testing']
		})

		expect(statusResponse).toMatchObject({
			statusCode: P.StatusCode.WARNING_MAJOR
		})

		statusResponse = await core.setStatus({
			statusCode: P.StatusCode.GOOD
		})

		expect(statusResponse).toMatchObject({
			statusCode: P.StatusCode.GOOD
		})
		console.log('observe')
		// Observe data:
		let observer = core.observe('peripheralDevices')
		observer.added = jest.fn()
		observer.changed = jest.fn()
		observer.removed = jest.fn()

		// Subscribe to data:
		let coll0 = core.getCollection('peripheralDevices')
		expect(coll0.findOne({ _id: id })).toBeFalsy()
		let subId = await core.subscribe('peripheralDevices', {
			_id: id
		})
		let coll1 = core.getCollection('peripheralDevices')
		expect(coll1.findOne({ _id: id })).toMatchObject({
			_id: id
		})

		expect(observer.added).toHaveBeenCalledTimes(1)
		// Unsubscribe:
		core.unsubscribe(subId)

		await wait(200) // wait for unsubscription to go through

		expect(observer.removed).toHaveBeenCalledTimes(1)

		// Uninitialize

		id = await core.unInitialize()

		expect(id).toEqual(core.deviceId)

		// Set the status now (should cause an error)
		await expect(core.setStatus({
			statusCode: P.StatusCode.GOOD
		})).rejects.toMatchObject({
			error: 404
		})

		// Close connection:
		await core.destroy()

		expect(core.connected).toEqual(false)

		expect(onConnectionChanged).toHaveBeenCalledTimes(2)
		expect(onConnectionChanged.mock.calls[1][0]).toEqual(false)
		expect(onConnected).toHaveBeenCalledTimes(1)
		expect(onDisconnected).toHaveBeenCalledTimes(1)
	})
	test('Connection timeout', async () => {
		// Initiate connection to Core:
		let err = null
		try {
			await core.init({
				host: '127.0.0.999',
				port: 3000
			})
		} catch (e) {
			err = e
		}
		expect(err).toMatch('Network error')

		expect(core.connected).toEqual(false)
	})
	test('Connection recover from close', async () => {
		// Initiate connection to Core:

		await core.init(hostOptions)
		expect(core.connected).toEqual(true)

		// Force-close the socket:
		core.ddp.ddpClient.socket.close()

		await wait(10)
		expect(core.connected).toEqual(false)

		await wait(1300)
		// should have reconnected by now

		expect(core.connected).toEqual(true)
	})
	test('Parent connections', async () => {

		let parentOnConnectionChanged = jest.fn()
		core.onConnectionChanged(parentOnConnectionChanged)

		let id = await core.init(hostOptions)
		expect(core.connected).toEqual(true)

		// Set child connection:
		let coreChild = new CoreConnection({
			deviceId: 'JestTestChild',
			deviceToken: 'abcd2',
			deviceType: P.DeviceType.OTHER,
			deviceName: 'Jest test framework child'
		})

		let onChildConnectionChanged = jest.fn()
		let onChildConnected = jest.fn()
		let onChildDisconnected = jest.fn()
		coreChild.onConnectionChanged(onChildConnectionChanged)
		coreChild.onConnected(onChildConnected)
		coreChild.onDisconnected(onChildDisconnected)

		let idChild = await coreChild.init(core)

		expect(idChild).toEqual(coreChild.deviceId)
		expect(coreChild.connected).toEqual(true)

		expect(onChildConnectionChanged).toHaveBeenCalledTimes(1)
		expect(onChildConnectionChanged.mock.calls[0][0]).toEqual(true)
		expect(onChildConnected).toHaveBeenCalledTimes(1)
		expect(onChildDisconnected).toHaveBeenCalledTimes(0)

		// Set some statuses:
		let statusResponse = await coreChild.setStatus({
			statusCode: P.StatusCode.WARNING_MAJOR,
			messages: ['testing testing']
		})

		expect(statusResponse).toMatchObject({
			statusCode: P.StatusCode.WARNING_MAJOR
		})

		statusResponse = await coreChild.setStatus({
			statusCode: P.StatusCode.GOOD
		})

		expect(statusResponse).toMatchObject({
			statusCode: P.StatusCode.GOOD
		})

		// Uninitialize:

		id = await coreChild.unInitialize()

		expect(id).toEqual(coreChild.deviceId)

		// Set the status now (should cause an error)
		await expect(coreChild.setStatus({
			statusCode: P.StatusCode.GOOD
		})).rejects.toMatchObject({
			error: 404
		})
	})

	test('Parent destroy', async () => {

		await core.init(hostOptions)
		// Set child connection:
		let coreChild = new CoreConnection({
			deviceId: 'JestTestChild',
			deviceToken: 'abcd2',
			deviceType: P.DeviceType.OTHER,
			deviceName: 'Jest test framework child'
		})
		let onChildConnectionChanged = jest.fn()
		let onChildConnected = jest.fn()
		let onChildDisconnected = jest.fn()
		coreChild.onConnectionChanged(onChildConnectionChanged)
		coreChild.onConnected(onChildConnected)
		coreChild.onDisconnected(onChildDisconnected)

		await coreChild.init(core)

		expect(coreChild.connected).toEqual(true)

		// Close parent connection:
		await core.destroy()

		expect(coreChild.connected).toEqual(false)

		expect(onChildConnectionChanged).toHaveBeenCalledTimes(2)
		expect(onChildConnectionChanged.mock.calls[1][0]).toEqual(false)
		expect(onChildConnected).toHaveBeenCalledTimes(1)
		expect(onChildDisconnected).toHaveBeenCalledTimes(1)

		// connect parent again:
		await core.init(hostOptions)

		expect(coreChild.connected).toEqual(true)

		expect(onChildConnectionChanged).toHaveBeenCalledTimes(3)
		expect(onChildConnectionChanged.mock.calls[2][0]).toEqual(true)
		expect(onChildConnected).toHaveBeenCalledTimes(2)
		expect(onChildDisconnected).toHaveBeenCalledTimes(1)
	})
	test('Child destroy', async () => {

		await core.init(hostOptions)
		// Set child connection:
		let coreChild = new CoreConnection({
			deviceId: 'JestTestChild',
			deviceToken: 'abcd2',
			deviceType: P.DeviceType.OTHER,
			deviceName: 'Jest test framework child'
		})
		let onChildConnectionChanged = jest.fn()
		let onChildConnected = jest.fn()
		let onChildDisconnected = jest.fn()
		coreChild.onConnectionChanged(onChildConnectionChanged)
		coreChild.onConnected(onChildConnected)
		coreChild.onDisconnected(onChildDisconnected)

		await coreChild.init(core)

		expect(coreChild.connected).toEqual(true)

		// Close parent connection:
		await coreChild.destroy()

		expect(coreChild.connected).toEqual(false)

		expect(onChildConnectionChanged).toHaveBeenCalledTimes(2)
		expect(onChildConnectionChanged.mock.calls[1][0]).toEqual(false)
		expect(onChildConnected).toHaveBeenCalledTimes(1)
		expect(onChildDisconnected).toHaveBeenCalledTimes(1)
	})
})
