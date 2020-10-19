
function disposeOne(disposable) {
	if (disposable && 'function' === typeof disposable.dispose) {
		disposable.dispose();
	}
}

export class AbstractModel {
	disposables = [];

	/**
	 * @param {string} modelName = ''
	 */
	constructor() {
/*
		if (new.target === Parent) {
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
		// Object/Attachment
		// Object/Contact
		// Object/Email
		// Object/Filter
		// Object/Folder
		// Object/Message
		// Object/Template
		return this.validJson(json) ? new this() : null;
//		json && Object.entries(json).forEach(([key, value]) => '@' !== key[0] && (this[key] = value));
	}

}
