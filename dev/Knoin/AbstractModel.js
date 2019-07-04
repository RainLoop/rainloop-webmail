import { isArray, disposeObject } from 'Common/Utils';

export class AbstractModel {
	sModelName = '';
	disposables = [];

	/**
	 * @param {string} modelName = ''
	 */
	constructor(modelName = '') {
		this.sModelName = modelName || '';
	}

	regDisposables(value) {
		if (isArray(value)) {
			value.forEach((item) => {
				this.disposables.push(item);
			});
		} else if (value) {
			this.disposables.push(value);
		}
	}

	onDestroy() {
		disposeObject(this);
	}
}
