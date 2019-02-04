# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="0.8.0"></a>
# [0.8.0](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.7.0...0.8.0) (2019-02-04)


### Bug Fixes

* readable error message ([8c2c8ca](https://github.com/nrkno/tv-automation-server-core-integration/commit/8c2c8ca))


### Features

* ddp support tls-options ([d53e42d](https://github.com/nrkno/tv-automation-server-core-integration/commit/d53e42d))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.6.3...0.7.0) (2019-01-11)


### Bug Fixes

* throw error on missing argument ([1ce1a90](https://github.com/nrkno/tv-automation-server-core-integration/commit/1ce1a90))


### Features

* Add Media_Manager DeviceType ([0c40194](https://github.com/nrkno/tv-automation-server-core-integration/commit/0c40194))
* updated typings from Core ([d668257](https://github.com/nrkno/tv-automation-server-core-integration/commit/d668257))



<a name="0.6.3"></a>
## [0.6.3](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.6.2...0.6.3) (2018-12-11)



<a name="0.6.2"></a>
## [0.6.2](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.6.1...0.6.2) (2018-10-24)


### Bug Fixes

* properly close socket connection before creating a new ([c1a4470](https://github.com/nrkno/tv-automation-server-core-integration/commit/c1a4470))



<a name="0.6.1"></a>
## [0.6.1](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.6.0...0.6.1) (2018-10-22)


### Bug Fixes

* update data-store dependency ([56d80df](https://github.com/nrkno/tv-automation-server-core-integration/commit/56d80df))



<a name="0.6.0"></a>
# [0.6.0](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.5.1...0.6.0) (2018-10-17)


### Bug Fixes

* added mock of ddp/Core, to run tests as unit tests, rather than integration tests ([92bfbdd](https://github.com/nrkno/tv-automation-server-core-integration/commit/92bfbdd))
* const definitions ([e225c75](https://github.com/nrkno/tv-automation-server-core-integration/commit/e225c75))
* refactoring, cleaned up emitters, added watchdog to destroy(), added tests ([af885b1](https://github.com/nrkno/tv-automation-server-core-integration/commit/af885b1))
* updated data-store dependency, du to 3.0.3 containing a bug related to folder creation ([894d2ac](https://github.com/nrkno/tv-automation-server-core-integration/commit/894d2ac))


### Features

* queued method calls implementation ([040dbb7](https://github.com/nrkno/tv-automation-server-core-integration/commit/040dbb7))



<a name="0.5.1"></a>
## [0.5.1](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.5.0...0.5.1) (2018-09-04)



<a name="0.5.0"></a>
# [0.5.0](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.4.1...0.5.0) (2018-08-14)


### Bug Fixes

* updated dependencies ([a5f95fb](https://github.com/nrkno/tv-automation-server-core-integration/commit/a5f95fb))


### Features

* added "ping" function, making a ping to the core. Only pinging when the watchdog isn't doing its stuff. ([75435e0](https://github.com/nrkno/tv-automation-server-core-integration/commit/75435e0))
* because ddp.connect() is async, createClient must also be asynchronous. ([8e34ae0](https://github.com/nrkno/tv-automation-server-core-integration/commit/8e34ae0))



<a name="0.4.1"></a>
## [0.4.1](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.4.0...0.4.1) (2018-08-03)


### Bug Fixes

* bug in collection.find using function selector ([59847ff](https://github.com/nrkno/tv-automation-server-core-integration/commit/59847ff))



<a name="0.4.0"></a>
# [0.4.0](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.3.2...0.4.0) (2018-07-04)


### Features

* Add segmentLineItemPlaybackStarted callback ([8823613](https://github.com/nrkno/tv-automation-server-core-integration/commit/8823613))



<a name="0.3.2"></a>
## [0.3.2](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.3.1...0.3.2) (2018-06-26)


### Bug Fixes

* refactoring & how events are fired ([2a2966d](https://github.com/nrkno/tv-automation-server-core-integration/commit/2a2966d))
* updated ddp dependency ([5d09770](https://github.com/nrkno/tv-automation-server-core-integration/commit/5d09770))



<a name="0.3.1"></a>
## [0.3.1](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.3.0...0.3.1) (2018-06-25)


### Bug Fixes

* updated data-store dep to fork, awaiting PR ([303ec5b](https://github.com/nrkno/tv-automation-server-core-integration/commit/303ec5b))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.2.0...0.3.0) (2018-06-25)


### Bug Fixes

* removing listeners upon destruction ([5df77c3](https://github.com/nrkno/tv-automation-server-core-integration/commit/5df77c3))


### Features

* added autoSubscribe method, that automatically renews subscriptions upon reconnection ([46c4c07](https://github.com/nrkno/tv-automation-server-core-integration/commit/46c4c07))



<a name="0.2.0"></a>
# [0.2.0](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.1.2...0.2.0) (2018-06-20)


### Features

* added watchDog ([2c03b58](https://github.com/nrkno/tv-automation-server-core-integration/commit/2c03b58))



<a name="0.1.2"></a>
## [0.1.2](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.1.1...0.1.2) (2018-06-18)



<a name="0.1.1"></a>
## [0.1.1](https://github.com/nrkno/tv-automation-server-core-integration/compare/0.1.0...0.1.1) (2018-06-15)



<a name="0.1.0"></a>
# 0.1.0 (2018-06-15)


### Bug Fixes

* bugfix ([0fd20e6](https://bitbucket.org/nrkno/tv-automation-server-core-integration/commits/0fd20e6))
* explicitly set request version in dependency to prevent voulnerability ([b0d0880](https://bitbucket.org/nrkno/tv-automation-server-core-integration/commits/b0d0880))
* lint errors ([294bb92](https://bitbucket.org/nrkno/tv-automation-server-core-integration/commits/294bb92))
* readme and new ssh fingerprint ([a6031c8](https://bitbucket.org/nrkno/tv-automation-server-core-integration/commits/a6031c8))
* remove ssh keys accidentally added to the repo ([d1d3942](https://bitbucket.org/nrkno/tv-automation-server-core-integration/commits/d1d3942))
* yarn update to hopefully fix npm package voulnerability ([ee95c5d](https://bitbucket.org/nrkno/tv-automation-server-core-integration/commits/ee95c5d))


### Features

* added connectionId ([f26fe54](https://bitbucket.org/nrkno/tv-automation-server-core-integration/commits/f26fe54))
* basic functionality and tests ([8feef39](https://bitbucket.org/nrkno/tv-automation-server-core-integration/commits/8feef39))
* CircleCI features ([2a1b730](https://bitbucket.org/nrkno/tv-automation-server-core-integration/commits/2a1b730))
* linting & added credentials generator ([851e6f8](https://bitbucket.org/nrkno/tv-automation-server-core-integration/commits/851e6f8))
* Rename package ([99e4fdf](https://bitbucket.org/nrkno/tv-automation-server-core-integration/commits/99e4fdf))
* support for having multiple mosdevices over same core-connection. Also added methods for mos data piping ([cf21e67](https://bitbucket.org/nrkno/tv-automation-server-core-integration/commits/cf21e67))
* timesync implementation ([9b38df3](https://bitbucket.org/nrkno/tv-automation-server-core-integration/commits/9b38df3))
