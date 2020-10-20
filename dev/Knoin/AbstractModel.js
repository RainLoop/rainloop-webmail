
function disposeOne(disposable) {
	if (disposable && 'function' === typeof disposable.dispose) {
		disposable.dispose();
	}
}

function typeCast(current, value) {
	switch (typeof current)
	{
	case 'boolean': return !!value;
	case 'string':  return null != value ? '' + value : '';
	case 'number':
		value = parseInt(value, 10);
		return (isNaN(value) || !isFinite(value)) ? 0 : value;
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
			throw new Error("Can't instantiate abstract class!");
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
		try {
			obj && Object.entries(json).forEach(([key, value]) => {
				if ('@' !== key[0]) {
					key = key[0].toLowerCase() + key.substr(1);
					switch (typeof obj[key])
					{
					case 'function':
						if (ko.isObservable(obj[key]) && !ko.isObservableArray(obj[key])) {
							obj[key](typeCast(obj[key](), value));
						}
//						else { console.log('('+(typeof obj[key])+') '+key+' not revived'); }
						break;
					case 'boolean':
					case 'string':
					case 'number':
						obj[key] = typeCast(obj[key], value);
						break;
//					case 'undefined':
//					default:
//						console.log('('+(typeof obj[key])+') '+key+' not revived');
					}
				}
			});
		} catch (e) {
			console.log(this.name);
			console.error(e);
		}
		return obj;
	}

}
