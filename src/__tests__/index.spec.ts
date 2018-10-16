import { CoreConnection } from '../index'
import { PeripheralDeviceAPI as P, PeripheralDeviceAPI } from '../lib/corePeripherals'
import * as MockDDP from '../__mocks__/ddp'
import * as _ from 'underscore'

process.on('unhandledRejection', (reason) => {
	console.log('Unhandled Promise rejection!', reason)
})

const orgSetTimeout = setTimeout

describe('coreConnection', () => {

	jest.mock('ddp')

	const coreHost = '127.0.0.1'
	const corePort = 3000

	function prepareNextMockDDP () {

		let device: any = {}

		function checkDevice (deviceId, token) {
			if (!deviceId) throw { error: 400, reason: 'id missing!' }
			if (!token) throw { error: 400, reason: 'token missing!' }

			if (device._id !== deviceId) throw { error: 404, reason:  'PeripheralDevice "' + deviceId + '" not found' }

			if (device._token !== token) throw { error: 401, reason: 'Not allowed access to peripheralDevice' }
		}

		let peripheralDeviceSubscription: any = null

		let methods = {
			'peripheralDevice.initialize': (deviceId, token, deviceData) => {

				device._id = deviceId
				device._token = token
				_.each(deviceData, (value, key) => {
					device[key] = value
				})

				if (peripheralDeviceSubscription) {
					peripheralDeviceSubscription.mockCollectionAdd('peripheralDevices', device)
				}

				return deviceId
			},
			'peripheralDevice.unInitialize': (deviceId, token) => {
				checkDevice(deviceId, token)

				device = {}

				if (peripheralDeviceSubscription) {
					peripheralDeviceSubscription.mockCollectionRemove('peripheralDevices', deviceId)
				}

				return deviceId
			},
			'systemTime.getTimeDiff': (deviceId, token) => {
				checkDevice(deviceId, token)

				return {
					currentTime: 1000
				}
			},
			'peripheralDevice.status': (deviceId, token, statusObj) => {
				checkDevice(deviceId, token)

				device.status = statusObj

				if (peripheralDeviceSubscription) {
					peripheralDeviceSubscription.mockCollectionChange('peripheralDevices', device)
				}
				return device.status
			},
			'peripheralDevice.testMethod': (deviceId, token, returnValue, throwError) => {
				checkDevice(deviceId, token)

				if (throwError) throw { 'error': 418, 'reason': 'Error thrown' }
				return returnValue
			},
			'myunknownMethod123': null
		}

		// @ts-ignore
		MockDDP.mockConstructNext((ddp: MockDDP) => {
			_.each(methods, (method, key) => {
				ddp.mockCall(key, method)
			})

			ddp.mockSetHost(coreHost, corePort)

			ddp.mockPublication('peripheralDevices', (subscription, device, token) => {
				checkDevice(device._id, token)

				peripheralDeviceSubscription = subscription

				if (device && !_.isEmpty(device)) {
					subscription.mockCollectionAdd('peripheralDevices', device)
				}
			})
		})

		return {
			device,
			methods
		}
	}

	function wait (time: number): Promise<void> {
		return new Promise((resolve) => {
			orgSetTimeout(() => {
				resolve()
			}, time)
		})
	}

	test('Just setup CoreConnection', async () => {

		prepareNextMockDDP()

		let core = new CoreConnection({
			deviceId: 'JestTest',
			deviceToken: 'abcd',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework'
		})

		let onConnectionChanged = jest.fn()
		let onConnected = jest.fn()
		let onDisconnected = jest.fn()
		core.onConnectionChanged(onConnectionChanged)
		core.onConnected(onConnected)
		core.onDisconnected(onDisconnected)

		expect(core.connected).toEqual(false)
	})

	test('Test connection and basic Core functionality', async () => {

		prepareNextMockDDP()

		let core = new CoreConnection({
			deviceId: 'JestTest',
			deviceToken: 'abcd',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework'
		})

		let onConnectionChanged = jest.fn()
		let onConnected = jest.fn()
		let onDisconnected = jest.fn()
		let onError = jest.fn()
		core.onConnectionChanged(onConnectionChanged)
		core.onConnected(onConnected)
		core.onDisconnected(onDisconnected)

		core.onError(onError)

		expect(core.connected).toEqual(false)
		// Initiate connection to Core:

		let id = await core.init({
			host: coreHost,
			port: corePort
		})

		expect(core.connected).toEqual(true)
		expect(id).toEqual(core.deviceId)

		expect(onConnectionChanged).toHaveBeenCalledTimes(1)
		expect(onConnectionChanged.mock.calls[0][0]).toEqual(true)
		expect(onConnected).toHaveBeenCalledTimes(1)
		expect(onDisconnected).toHaveBeenCalledTimes(0)

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

		// Call a method
		await expect(core.callMethod('peripheralDevice.testMethod', ['return123'])).resolves.toEqual('return123')
		// Call a method which will throw error:
		await expect(core.callMethod('peripheralDevice.testMethod', ['abcd', true])).rejects.toMatchObject({
			error: 418,
			reason: /error/
		})
		// Call an unknown method
		await expect(core.callMethod('myunknownMethod123', ['a', 'b'])).rejects.toMatchObject({
			error: 404,
			reason: /error/
		})

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

		expect(onConnectionChanged).toHaveBeenCalledTimes(1)
		// Close connection:
		await core.destroy()

		expect(core.connected).toEqual(false)
		expect(onConnectionChanged).toHaveBeenCalledTimes(2)
		expect(onConnectionChanged.mock.calls[1][0]).toEqual(false)
		expect(onConnected).toHaveBeenCalledTimes(1)
		expect(onDisconnected).toHaveBeenCalledTimes(1)

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Connection timeout', async () => {

		prepareNextMockDDP()
		let core = new CoreConnection({
			deviceId: 'JestTest',
			deviceToken: 'abcd',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework'
		})

		let onConnectionChanged = jest.fn()
		let onConnected = jest.fn()
		let onDisconnected = jest.fn()
		let onFailed = jest.fn()
		let onError = jest.fn()
		core.onConnectionChanged(onConnectionChanged)
		core.onConnected(onConnected)
		core.onDisconnected(onDisconnected)
		core.onFailed(onFailed)
		core.onError(onError)

		expect(core.connected).toEqual(false)
		// Initiate connection to Core:

		let err = null
		try {
			await core.init({
				host: '127.0.0.999',
				port: corePort
			})
		} catch (e) {
			err = e
		}
		expect(err).toMatch('Network error')

		expect(core.connected).toEqual(false)

		await core.destroy()
	})
	test('Connection recover from close', async () => {

		prepareNextMockDDP()
		let core = new CoreConnection({
			deviceId: 'JestTest',
			deviceToken: 'abcd',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework'
		})

		let onConnectionChanged = jest.fn()
		let onConnected = jest.fn()
		let onDisconnected = jest.fn()
		let onFailed = jest.fn()
		let onError = jest.fn()
		core.onConnectionChanged(onConnectionChanged)
		core.onConnected(onConnected)
		core.onDisconnected(onDisconnected)
		core.onFailed(onFailed)
		core.onError(onError)

		expect(core.connected).toEqual(false)
		// Initiate connection to Core:

		await core.init({
			host: coreHost,
			port: corePort
		})
		expect(core.connected).toEqual(true)

		// Force-close the socket:
		core.ddp.ddpClient.socket.close()

		await wait(10)
		expect(core.connected).toEqual(false)

		await wait(1300)
		// should have reconnected by now

		expect(core.connected).toEqual(true)

		await core.destroy()
	})
	test('autoSubscription', async () => {

		prepareNextMockDDP()
		let core = new CoreConnection({
			deviceId: 'JestTest',
			deviceToken: 'abcd',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework'
		})

		let onConnectionChanged = jest.fn()
		let onConnected = jest.fn()
		let onDisconnected = jest.fn()
		let onFailed = jest.fn()
		let onError = jest.fn()
		core.onConnectionChanged(onConnectionChanged)
		core.onConnected(onConnected)
		core.onDisconnected(onDisconnected)
		core.onFailed(onFailed)
		core.onError(onError)

		expect(core.connected).toEqual(false)
		// Initiate connection to Core:

		await core.init({
			host: coreHost,
			port: corePort
		})
		expect(core.connected).toEqual(true)

		let observerAdded = jest.fn()
		let observerChanged = jest.fn()
		let observerRemoved = jest.fn()
		let observer = core.observe('peripheralDevices')
		observer.added = observerAdded
		observer.changed = observerChanged
		observer.removed = observerRemoved

		await core.autoSubscribe('peripheralDevices', { _id: 'JestTest' })

		expect(observerAdded).toHaveBeenCalledTimes(1)

		await core.setStatus({
			statusCode: PeripheralDeviceAPI.StatusCode.GOOD,
			messages: ['Jest A ' + Date.now()]
		})
		await wait(300)
		expect(observerChanged).toHaveBeenCalledTimes(1)

		// Force-close the socket:
		core.ddp.ddpClient.socket.close()

		await wait(10)
		expect(core.connected).toEqual(false)

		await wait(1300)
		// should have reconnected by now
		expect(core.connected).toEqual(true)

		observerChanged.mockClear()
		await core.setStatus({
			statusCode: PeripheralDeviceAPI.StatusCode.GOOD,
			messages: ['Jest B' + Date.now()]
		})
		await wait(300)
		expect(observerChanged).toHaveBeenCalledTimes(1)

		await core.destroy()
	})
	test('Connection recover from a close that lasts some time', async () => {

		prepareNextMockDDP()
		let core = new CoreConnection({
			deviceId: 'JestTest',
			deviceToken: 'abcd',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework'
		})

		let onConnectionChanged = jest.fn()
		let onConnected = jest.fn()
		let onDisconnected = jest.fn()
		let onFailed = jest.fn()
		let onError = jest.fn()
		core.onConnectionChanged(onConnectionChanged)
		core.onConnected(onConnected)
		core.onDisconnected(onDisconnected)
		core.onFailed(onFailed)
		core.onError(onError)

		expect(core.connected).toEqual(false)
		// Initiate connection to Core:

		await core.init({
			host: coreHost,
			port: corePort,
			autoReconnect: true,
			autoReconnectTimer: 100
		})
		expect(core.connected).toEqual(true)

		// temporary scramble the ddp host:
		core.ddp.ddpClient.host = '127.0.0.9'
		// Force-close the socket:
		core.ddp.ddpClient.socket.close()

		await wait(10)
		expect(core.connected).toEqual(false)

		await wait(1000) // allow for some reconnections

		// restore ddp host:
		core.ddp.ddpClient.host = '127.0.0.1'
		await wait(1000)
		// should have reconnected by now

		expect(core.connected).toEqual(true)

		await core.destroy()
	})
	test('Parent connections', async () => {
		prepareNextMockDDP()
		let coreParent = new CoreConnection({
			deviceId: 'JestTest',
			deviceToken: 'abcd',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework'
		})
		let onError = jest.fn()
		coreParent.onError(onError)

		let parentOnConnectionChanged = jest.fn()
		coreParent.onConnectionChanged(parentOnConnectionChanged)

		let id = await coreParent.init({
			host: coreHost,
			port: corePort
		})
		expect(coreParent.connected).toEqual(true)

		// Set child connection:
		prepareNextMockDDP()
		let coreChild = new CoreConnection({
			deviceId: 'JestTestChild',
			deviceToken: 'abcd2',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework child'
		})

		let onChildConnectionChanged = jest.fn()
		let onChildConnected = jest.fn()
		let onChildDisconnected = jest.fn()
		let onChildError = jest.fn()
		coreChild.onConnectionChanged(onChildConnectionChanged)
		coreChild.onConnected(onChildConnected)
		coreChild.onDisconnected(onChildDisconnected)
		coreChild.onError(onChildError)

		let idChild = await coreChild.init(coreParent)

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

		await coreParent.destroy()
		await coreChild.destroy()

		expect(onError).toHaveBeenCalledTimes(0)
		expect(onChildError).toHaveBeenCalledTimes(0)
	})

	test('Parent destroy', async () => {
		prepareNextMockDDP()
		let coreParent = new CoreConnection({
			deviceId: 'JestTest',
			deviceToken: 'abcd',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework'
		})
		let onParentError = jest.fn()
		coreParent.onError(onParentError)

		await coreParent.init({
			host: coreHost,
			port: corePort
		})
		// Set child connection:
		prepareNextMockDDP()
		let coreChild = new CoreConnection({
			deviceId: 'JestTestChild',
			deviceToken: 'abcd2',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework child'
		})
		let onChildConnectionChanged = jest.fn()
		let onChildConnected = jest.fn()
		let onChildDisconnected = jest.fn()
		let onChildError = jest.fn()
		coreChild.onConnectionChanged(onChildConnectionChanged)
		coreChild.onConnected(onChildConnected)
		coreChild.onDisconnected(onChildDisconnected)
		coreChild.onError(onChildError)

		await coreChild.init(coreParent)

		expect(coreChild.connected).toEqual(true)

		// Close parent connection:
		await coreParent.destroy()

		expect(coreChild.connected).toEqual(false)

		expect(onChildConnectionChanged).toHaveBeenCalledTimes(2)
		expect(onChildConnectionChanged.mock.calls[1][0]).toEqual(false)
		expect(onChildConnected).toHaveBeenCalledTimes(1)
		expect(onChildDisconnected).toHaveBeenCalledTimes(1)
		// Setup stuff again
		onChildConnectionChanged.mockClear()
		onChildConnected.mockClear()
		onChildDisconnected.mockClear()

		coreChild.onConnectionChanged(onChildConnectionChanged)
		coreChild.onConnected(onChildConnected)
		coreChild.onDisconnected(onChildDisconnected)
		// connect parent again:

		await coreParent.init({
			host: coreHost,
			port: corePort
		})

		await coreChild.init(coreParent)

		expect(coreChild.connected).toEqual(true)

		expect(onChildConnected).toHaveBeenCalledTimes(1)
		expect(onChildConnectionChanged).toHaveBeenCalledTimes(1)
		expect(onChildConnectionChanged.mock.calls[0][0]).toEqual(true)
		expect(onChildDisconnected).toHaveBeenCalledTimes(0)

		await coreParent.destroy()
		await coreChild.destroy()

		expect(onChildError).toHaveBeenCalledTimes(0)
		expect(onParentError).toHaveBeenCalledTimes(0)
	})
	test('Child destroy', async () => {

		prepareNextMockDDP()
		let coreParent = new CoreConnection({
			deviceId: 'JestTest',
			deviceToken: 'abcd',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework'
		})
		let onParentError = jest.fn()
		coreParent.onError(onParentError)
		await coreParent.init({
			host: coreHost,
			port: corePort
		})
		// Set child connection:
		prepareNextMockDDP()
		let coreChild = new CoreConnection({
			deviceId: 'JestTestChild',
			deviceToken: 'abcd2',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework child'
		})
		let onChildConnectionChanged = jest.fn()
		let onChildConnected = jest.fn()
		let onChildDisconnected = jest.fn()
		let onChildError = jest.fn()
		coreChild.onConnectionChanged(onChildConnectionChanged)
		coreChild.onConnected(onChildConnected)
		coreChild.onDisconnected(onChildDisconnected)
		coreChild.onError(onChildError)

		await coreChild.init(coreParent)

		expect(coreChild.connected).toEqual(true)

		// Close parent connection:
		await coreChild.destroy()

		expect(coreChild.connected).toEqual(false)

		expect(onChildConnectionChanged).toHaveBeenCalledTimes(2)
		expect(onChildConnectionChanged.mock.calls[1][0]).toEqual(false)
		expect(onChildConnected).toHaveBeenCalledTimes(1)
		expect(onChildDisconnected).toHaveBeenCalledTimes(1)

		await coreParent.destroy()

		expect(onParentError).toHaveBeenCalledTimes(0)
		expect(onChildError).toHaveBeenCalledTimes(0)
	})
	test('Test callMethodLowPrio', async () => {

		prepareNextMockDDP()
		let core = new CoreConnection({
			deviceId: 'JestTest',
			deviceToken: 'abcd',
			deviceType: P.DeviceType.PLAYOUT,
			deviceName: 'Jest test framework'
		})

		let onError = jest.fn()
		core.onError(onError)

		await core.init({
			host: coreHost,
			port: corePort
		})

		expect(core.connected).toEqual(true)

		// Call a method
		await expect(core.callMethod('peripheralDevice.testMethod', ['return123'])).resolves.toEqual('return123')
		// Call a low-prio method
		await expect(core.callMethodLowPrio('peripheralDevice.testMethod', ['low123'])).resolves.toEqual('low123')

		let ps: Promise<any>[] = []

		// method should be called before low-prio:
		let i = 0
		ps.push(core.callMethodLowPrio('peripheralDevice.testMethod', ['low1'])
			.then((res) => {
				expect(res).toEqual('low1')
				return i++
			}))
		ps.push(core.callMethodLowPrio('peripheralDevice.testMethod', ['low2'])
			.then((res) => {
				expect(res).toEqual('low2')
				return i++
			}))
		ps.push(core.callMethod('peripheralDevice.testMethod', ['normal1'])
			.then((res) => {
				expect(res).toEqual('normal1')
				return i++
			}))

		let r = await Promise.all(ps)

		expect(r[0]).toBeGreaterThan(r[2]) // because callMethod should have run before callMethodLowPrio
		expect(r[1]).toBeGreaterThan(r[2]) // because callMethod should have run before callMethodLowPrio

		// Clean up
		await core.destroy()

		expect(onError).toHaveBeenCalledTimes(0)
	})
})
