
import {CoreConnection, DeviceType} from '../index'
import {PeripheralDeviceAPI as P} from '../lib/corePeripherals'

test('Integration: Test connection and basic Core functionality', async () => {

	// Note: This is an integration test, that require a Core to connect to

	let core = new CoreConnection({
		deviceId: 'JestTest',
		deviceToken: 'abcd',
		deviceType: DeviceType.PLAYOUT,
		deviceName: 'Jest test framework'
	})

	// Initiate connection to mothership:

	let id = await core.init({
		host: '192.168.177.128',
		port: 3000
	})

	expect(core.connected).toEqual(true)

	expect(id).toEqual(core.deviceId)

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

	// Uninitialize

	id = await core.unInitialize()

	expect(id).toEqual(core.deviceId)

	// Set the status now (should cause an error)
	await expect(core.setStatus({
		statusCode: P.StatusCode.GOOD
	})).rejects.toMatchObject({
		error: 404
	})

})
