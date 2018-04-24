
import {CoreConnection, DeviceType} from '../src/index'
import {PeripheralDeviceAPI as P} from '../src/lib/corePeripherals'

let core = new CoreConnection({
	deviceId: 'Example',
	deviceToken: 'abcd',
	deviceType: DeviceType.PLAYOUT,
	deviceName: 'Jest test framework'
})

core.onConnectionChanged((connected) => {
	console.log('ConnectionChanged', connected)
})
core.onConnected(() => {
	console.log('Connected!')
})
core.onDisconnected(() => {
	console.log('Disconnected!')
})
core.onError((err) => {
	console.log('Error: ' + (err.message || err.toString() || err))
})
core.onFailed((err) => {
	console.log('Failed: ' + (err.message || err.toString() || err))
})

// Initiate connection to Core:
core.init({
	host: '127.0.0.1',
	port: 3000
})
.then(() => {
	core.setStatus({
		statusCode: P.StatusCode.GOOD,
		messages: ['Testing example']
	})
})
.then(() => {
	setTimeout(() => {
		console.log('== closing connection..')

		core.ddp.ddpClient.socket.close()
	},1000)
})
.then(() => {
	console.log('waiting for connection...')
	setTimeout(() => {
		console.log('too late...')
	},10000)
})
