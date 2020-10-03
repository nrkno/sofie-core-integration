import { EventEmitter } from "events";
import {
	Connected,
	Result,
	Message,
	Method,
	Ready,
	Sub,
	Added,
	UnSub,
	NoSub,
	Removed,
	Changed,
} from "../lib/ddpClient";
import * as EJSON from "ejson";
// import * as util from 'util'

const literal = <T>(t: T) => t;

export class Client extends EventEmitter {
	private cachedId: string = "";
	private initialized = true;

	constructor(
		_url: string,
		_protcols?: Array<string> | null,
		_options?: { [name: string]: unknown }
	) {
		super();
		setTimeout(() => {
			this.emit("open");
		}, 1);
	}

	send(data: string): void {
		const message = EJSON.parse(data) as Message;
		// console.log(util.inspect(message, { depth: 10 }))
		if (message.msg === "connect") {
			this.emit("message", {
				data: EJSON.stringify(
					literal<Connected>({
						msg: "connected",
						session: "wibble",
					})
				),
			});
			return;
		}
		if (message.msg === "method") {
			const methodMessage = message as Method;
			if (methodMessage.method === "peripheralDevice.initialize") {
				this.initialized = true;
				this.emit("message", {
					data: EJSON.stringify(
						literal<Result>({
							msg: "result",
							id: methodMessage.id,
							result: methodMessage.params![0],
						})
					),
				});
				return;
			}
			if (methodMessage.method === "systemTime.getTimeDiff") {
				this.emit("message", {
					data: EJSON.stringify(
						literal<Result>({
							msg: "result",
							id: methodMessage.id,
							result: { currentTime: Date.now() },
						})
					),
				});
				return;
			}
			if (methodMessage.method === "peripheralDevice.status") {
				if (this.initialized) {
					this.emit("message", {
						data: EJSON.stringify(
							literal<Result>({
								msg: "result",
								id: methodMessage.id,
								result: {
									statusCode: (methodMessage.params![2] as any)
										.statusCode,
								},
							})
						),
					});
					if (
						(methodMessage.params![2] as any).messages[0].indexOf(
							"Jest "
						) >= 0
					) {
						this.emit("message", {
							data: EJSON.stringify(
								literal<Changed>({
									msg: "changed",
									collection: "peripheralDevices",
									id: "JestTest",
								})
							),
						});
					}
				} else {
					this.emit("message", {
						data: EJSON.stringify(
							literal<Result>({
								msg: "result",
								id: methodMessage.id,
								error: {
									error: 404,
									errorType: "Meteor.Error",
								},
							})
						),
					});
				}
				return;
			}
			if (methodMessage.method === "peripheralDevice.testMethod") {
				this.emit("message", {
					data: EJSON.stringify(
						literal<Result>({
							msg: "result",
							id: methodMessage.id,
							result: methodMessage.params![3]
								? undefined
								: methodMessage.params![2],
							error: methodMessage.params![3]
								? {
										error: 418,
										reason: "Bad Wolf error",
										errorType: "Meteor.Error",
								  }
								: undefined,
						})
					),
				});
				return;
			}
			if (methodMessage.method === "peripheralDevice.unInitialize") {
				this.initialized = false;
				this.emit("message", {
					data: EJSON.stringify(
						literal<Result>({
							msg: "result",
							id: methodMessage.id,
							result: methodMessage.params![0]
						})
					),
				});
				return;
			}
			this.emit("message", {
				data: EJSON.stringify(
					literal<Result>({
						msg: "result",
						id: methodMessage.id,
						error: {
							error: 404,
							reason: "Where have you gone error",
							errorType: "Meteor.Error",
						},
					})
				),
			});
			return;
		}
		if (message.msg === "sub") {
			const subMessage = message as Sub;
			this.cachedId = (subMessage.params![0] as any)._id;
			setTimeout(() => {
				this.emit("message", {
					data: EJSON.stringify(
						literal<Added>({
							msg: "added",
							collection: subMessage.name,
							id: this.cachedId,
						})
					),
				});
			}, 1);
			setTimeout(() => {
				this.emit("message", {
					data: EJSON.stringify(
						literal<Ready>({
							msg: "ready",
							subs: [subMessage.id],
						})
					),
				});
			}, 100);
			return;
		}
		if (message.msg === "unsub") {
			const unsubMessage = message as UnSub;
			this.emit("message", {
				data: JSON.stringify(
					literal<Removed>({
						msg: "removed",
						collection: "peripheralDevices",
						id: this.cachedId,
					})
				),
			});
			this.emit("message", {
				data: JSON.stringify(
					literal<NoSub>({
						msg: "nosub",
						id: unsubMessage.id,
					})
				),
			});
		}
	}
	close(): void {
		this.emit("close", {
			code: 200,
			reason: "I had a great time!",
			wasClean: true,
		});
	}
}
