
let store = {}
class Store {
	private _store: any
	constructor (name, options) {
		options = options
		if (!store[name]) store[name] = {}
		this._store = store[name]
	}
	set (key: string, value: any) {
		this._store[key] = value
		return this
	}
	get (key: string) {
		return this._store[key]
	}
}
export = Store
