
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
//		this.sModelName = new.target.name;
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
}
