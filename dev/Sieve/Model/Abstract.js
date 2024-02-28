import { forEachObjectValue, forEachObjectEntry, koComputable } from 'Sieve/Utils';

function typeCast(curValue, newValue) {
	if (null != curValue) {
		switch (typeof curValue)
		{
		case 'boolean': return 0 != newValue && !!newValue;
		case 'number': return isFinite(newValue) ? parseFloat(newValue) : 0;
		case 'string': return null != newValue ? '' + newValue : '';
		case 'object':
			if (curValue.constructor.reviveFromJson) {
				return curValue.constructor.reviveFromJson(newValue);
			}
			if (Array.isArray(curValue) && !Array.isArray(newValue))
				return [];
		}
	}
	return newValue;
}

export class AbstractModel {
	constructor() {
/*
		if (new.target === AbstractModel) {
			throw Error("Can't instantiate AbstractModel!");
		}
*/
		Object.defineProperty(this, 'disposables', {value: []});
	}

	addObservables(observables) {
		forEachObjectEntry(observables, (key, value) =>
			this[key] || (this[key] = /*isArray(value) ? ko.observableArray(value) :*/ ko.observable(value))
		);
	}

	addComputables(computables) {
		forEachObjectEntry(computables, (key, fn) => this[key] = koComputable(fn));
	}

	addSubscribables(subscribables) {
		forEachObjectEntry(subscribables, (key, fn) => this.disposables.push( this[key].subscribe(fn) ) );
	}

	/** Called by delegateRunOnDestroy */
	onDestroy() {
		/** dispose ko subscribables */
		this.disposables.forEach(disposable => {
			typeof disposable?.dispose === 'function' && disposable.dispose();
		});
		/** clear object entries */
//		forEachObjectEntry(this, (key, value) => {
		forEachObjectValue(this, value => {
			/** clear CollectionModel */
			(ko.isObservableArray(value) ? value() : value)?.onDestroy?.();
			/** destroy ko.observable/ko.computed? */
//			dispose(value);
			/** clear object value */
//			this[key] = null; // TODO: issue with Contacts view
		});
//		this.disposables = [];
	}

	/**
	 * @static
	 * @param {FetchJson} json
	 * @returns {boolean}
	 */
	static validJson(json) {
		return !!(json && ('Object/'+this.name.replace('Model', '') === json['@Object']));
	}

	/**
	 * @static
	 * @param {FetchJson} json
	 * @returns {*Model}
	 */
	static reviveFromJson(json) {
		let obj = this.validJson(json) ? new this() : null;
		obj?.revivePropertiesFromJson(json);
		return obj;
	}

	revivePropertiesFromJson(json) {
		const model = this.constructor,
			valid = model.validJson(json);
		valid && forEachObjectEntry(json, (key, value) => {
			if ('@' !== key[0]) try {
				key = key[0].toLowerCase() + key.slice(1);
				switch (typeof this[key])
				{
				case 'function':
					if (ko.isObservable(this[key])) {
						this[key](typeCast(this[key](), value));
//						console.log('Observable ' + (typeof this[key]()) + ' ' + (model.name) + '.' + key + ' revived');
					}
//					else console.log(model.name + '.' + key + ' is a function');
					break;
				case 'boolean':
				case 'number':
				case 'object':
				case 'string':
					this[key] = typeCast(this[key], value);
					break;
				case 'undefined':
					console.log(`Undefined ${model.name}.${key} not set`);
//					this[key] = value;
					break;
//				default:
//					console.log((typeof this[key])+` ${model.name}.${key} not revived`);
//					console.log((typeof this[key])+' '+(model.name)+'.'+key+' not revived');
				}
			} catch (e) {
				console.log(model.name + '.' + key);
				console.error(e);
			}
		});
		return valid;
	}

}
