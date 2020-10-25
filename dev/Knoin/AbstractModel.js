
function disposeOne(disposable) {
	if (disposable && 'function' === typeof disposable.dispose) {
		disposable.dispose();
	}
}

function typeCast(curValue, newValue) {
	switch (typeof curValue)
	{
	case 'boolean': return !!newValue;
	case 'number': return isFinite(newValue) ? parseFloat(newValue) : 0;
	case 'string': return null != newValue ? '' + newValue : '';
	case 'object':
		if (curValue.constructor.reviveFromJson) {
			return curValue.constructor.reviveFromJson(newValue) || undefined;
		}
		if (!Array.isArray(curValue) || !Array.isArray(newValue))
			return undefined;
	}
	return newValue;
}

export class AbstractModel {
	disposables = [];

	constructor() {
/*
		if (new.target === AbstractModel) {
			throw new Error("Can't instantiate AbstractModel!");
		}
*/
	}

	addObservables(obj) {
		Object.entries(obj).forEach(([key, value]) => this[key] = ko.observable(value) );
/*
		Object.entries(obj).forEach(([key, value]) =>
			this[key] = Array.isArray(value) ? ko.observableArray(value) : ko.observable(value)
		);
*/
	}

	addComputables(obj) {
		Object.entries(obj).forEach(([key, fn]) => this[key] = ko.computed(fn) );
	}

	addSubscribables(obj) {
		Object.entries(obj).forEach(([key, fn]) => this.disposables.push( this[key].subscribe(fn) ) );
	}

	onDestroy() {
		this.disposables.forEach(disposeOne);
		Object.entries(this).forEach(([key, value]) => {
			disposeOne(value);
			this[key] = null;
		});
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
		try {
			if (!model.validJson(json)) {
				return false;
			}
			Object.entries(json).forEach(([key, value]) => {
				if ('@' !== key[0]) {
					key = key[0].toLowerCase() + key.substr(1);
					switch (typeof this[key])
					{
					case 'function':
						if (ko.isObservable(this[key])) {
							value = typeCast(this[key](), value);
							if (undefined !== value) {
								this[key](value);
								break;
							}
//							console.log((typeof this[key]())+' '+(model.name)+'.'+key+' not revived');
						}
//						else console.log(model.name + '.' + key + ' is a function');
						break;
					case 'boolean':
					case 'number':
					case 'object':
					case 'string':
						value = typeCast(this[key], value);
						if (undefined !== value) {
							this[key] = value;
							break;
						}
						// fall through
					case 'undefined':
					default:
//						console.log((typeof this[key])+' '+(model.name)+'.'+key+' not revived');
					}
				}
			});
		} catch (e) {
			console.log(model.name);
			console.error(e);
		}
		return true;
	}

}
