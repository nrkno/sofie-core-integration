# Core-integration
[![CircleCI](https://circleci.com/gh/nrkno/tv-automation-server-core-integration.svg?style=svg)](https://circleci.com/gh/nrkno/tv-automation-server-core-integration)

This library is used to connec to to the Core (https://github.com/nrkno/tv-automation-server-core) from other Node processes.

# Getting started 

## Typescript
```typescript
import {CoreConnection, DeviceType} from "tv-automation-server-core-integration"

let core = new CoreConnection({
	deviceId: "MyTest",
	deviceToken: "abcd",
	deviceType: DeviceType.PLAYOUT,
	deviceName: "Jest test framework"
})
// Initiate connection to Core:
core.init({
	host: "192.168.177.128",
	port: 3000
}).then(() => {
    return core.setStatus({
		statusCode: 1,
		messages: ["I'm alive!"]
	})
})
.then(() => {
    // Whatever
})
.catch((err) => {
    console.log(err)
})
```

## Dev tips:
* Install yarn
	https://yarnpkg.com
* Install jest
	yarn global add jest
	This is our testing framework
* Install dependencies
	yarn
* Then you can:
   * Build:
	yarn build
   * run test
	jest
   * watch
	yarn watch