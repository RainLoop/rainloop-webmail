import { isArray, isFunction, addObservablesTo, addComputablesTo } from 'Common/Utils';

function dispose(disposable) {
	if (disposable && isFunction(disposable.dispose)) {
		disposable.dispose();
	}
}

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
			if (isArray(curValue) && !isArray(newValue))
				return [];
		}
	}
	return newValue;
}

export class AbstractModel {
	constructor() {
/*
		if (new.target === AbstractModel) {
			throw new Error("Can't instantiate AbstractModel!");
		}
*/
		this.subscribables = [];
	}

	addObservables(observables) {
		addObservablesTo(this, observables);
	}

	addComputables(computables) {
		addComputablesTo(this, computables);
	}

	addSubscribables(subscribables) {
		Object.entries(subscribables).forEach(([key, fn]) => this.subscribables.push( this[key].subscribe(fn) ) );
	}

	/** Called by delegateRunOnDestroy */
	onDestroy() {
		/** dispose ko subscribables */
		this.subscribables.forEach(dispose);
		/** clear object entries */
//		Object.entries(this).forEach(([key, value]) => {
		Object.values(this).forEach(value => {
			/** clear CollectionModel */
			let arr = ko.isObservableArray(value) ? value() : value;
			arr && arr.onDestroy && value.onDestroy();
			/** destroy ko.observable/ko.computed? */
			dispose(value);
			/** clear object value */
//			this[key] = null; // TODO: issue with Contacts view
		});
//		this.subscribables = [];
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
		obj && obj.revivePropertiesFromJson(json);
		return obj;
	}

	revivePropertiesFromJson(json) {
		let model = this.constructor;
		if (!model.validJson(json)) {
			return false;
		}
		Object.entries(json).forEach(([key, value]) => {
			if ('@' !== key[0]) try {
				key = key[0].toLowerCase() + key.substr(1);
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
					// fall through
				case 'undefined':
				default:
//					console.log((typeof this[key])+' '+(model.name)+'.'+key+' not revived');
				}
			} catch (e) {
				console.log(model.name + '.' + key);
				console.error(e);
			}
		});
		return true;
	}

}
