import { EventEmitter } from 'events'
import { Connected, Result, Message, Method, Ready, Sub } from '../lib/ddpClient'
import * as EJSON from 'ejson'
import * as util from 'util'

const literal = <T> (t: T) => t

export class Client extends EventEmitter {
    constructor (url: string, protcols?: Array<string> | null, options?: { [name: string]: unknown }) {
        super()
        console.log('Im constructed', url, protcols, options)
        setTimeout(() => { this.emit('open') }, 1)
    }
    send (data: string): void {
        const message = <Message> EJSON.parse(data)
        console.log(util.inspect(message, { depth: 10 }))
        if (message.msg === 'connect') {
            this.emit('message', { 
                data: EJSON.stringify(literal<Connected>({ 
                    msg: 'connected',
                    session: 'wibble'
                })) 
            })
            return
        }
        if (message.msg === 'method') {
            const methodMessage = <Method> message
            if (methodMessage.method === 'peripheralDevice.initialize') {
                this.emit('message', {
                    data: EJSON.stringify(literal<Result>({
                        msg: 'result',
                        id: methodMessage.id,
                        result: 'JestTest'
                    }))
                })
                return
            }
            if (methodMessage.method === 'systemTime.getTimeDiff') {
                this.emit('message', {
                    data: EJSON.stringify(literal<Result>({
                        msg: 'result',
                        id: methodMessage.id,
                        result: { currentTime: Date.now() }
                    }))
                })
                return
            }
            if (methodMessage.method === 'peripheralDevice.status') {
                this.emit('message', {
                    data: EJSON.stringify(literal<Result>({
                        msg: 'result',
                        id: methodMessage.id,
                        result: { statusCode: (methodMessage.params![2] as any).statusCode }
                    }))
                })
                return
            }
        }
        if (message.msg === 'sub') {
            const subMessage = <Sub> message
            this.emit('message', {
                data: EJSON.stringify(literal<Ready>({
                    msg: 'ready',
                    subs: [ subMessage.name ]
                }))
            })
        }
    }
    close(): void {
        this.emit('close')
    }
}