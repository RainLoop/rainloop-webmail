
function disposeOne(disposable) {
	if (disposable && 'function' === typeof disposable.dispose) {
		disposable.dispose();
	}
}

function typeCast(current, value) {
	switch (typeof current)
	{
	case 'boolean': return !!value;
	case 'number': return isFinite(value) ? parseFloat(value) : 0;
	case 'string': return null != value ? '' + value : '';
	case 'object':
		if (current.constructor.reviveFromJson) {
			return current.constructor.reviveFromJson(value) || undefined;
		}
		if (!Array.isArray(current) || !Array.isArray(value))
			return undefined;
	}
	return value;
}

export class AbstractModel {
	disposables = [];

	/**
	 * @param {string} modelName = ''
	 */
	constructor() {
/*
		if (new.target === AbstractModel) {
			throw new Error("Can't instantiate AbstractModel!");
		}
		this.sModelName = new.target.name;
*/
	}

	regDisposables(value) {
		if (Array.isArray(value)) {
			value.forEach(item => this.disposables.push(item));
		} else if (value) {
			this.disposables.push(value);
		}
	}

	onDestroy() {
		if (Array.isArray(this.disposables)) {
			this.disposables.forEach(disposeOne);
		}
		Object.values(this).forEach(disposeOne);
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
