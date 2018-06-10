import { CoreConnection, DeviceType } from '../index'
// import { PeripheralDeviceAPI as P } from '../lib/corePeripherals'

test('Just setup CoreConnection', async () => {

	// Note: This is an integration test, that require a Core to connect to

	let core = new CoreConnection({
		deviceId: 'JestTest',
		deviceToken: 'abcd',
		deviceType: DeviceType.PLAYOUT,
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
