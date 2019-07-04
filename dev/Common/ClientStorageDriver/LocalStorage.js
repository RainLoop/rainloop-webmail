import window from 'window';
import { isUnd } from 'Common/Utils';
import { isStorageSupported } from 'Storage/RainLoop';
import { CLIENT_SIDE_STORAGE_INDEX_NAME } from 'Common/Consts';

class LocalStorageDriver {
	s = null;

	constructor() {
		this.s = window.localStorage || null;
	}

	/**
	 * @param {string} key
	 * @param {*} data
	 * @returns {boolean}
	 */
	set(key, data) {
		if (!this.s) {
			return false;
		}

		let storageResult = null;
		try {
			const storageValue = this.s.getItem(CLIENT_SIDE_STORAGE_INDEX_NAME) || null;
			storageResult = null === storageValue ? null : window.JSON.parse(storageValue);
		} catch (e) {} // eslint-disable-line no-empty

		(storageResult || (storageResult = {}))[key] = data;

		try {
			this.s.setItem(CLIENT_SIDE_STORAGE_INDEX_NAME, window.JSON.stringify(storageResult));
			return true;
		} catch (e) {} // eslint-disable-line no-empty

		return false;
	}

	/**
	 * @param {string} key
	 * @returns {*}
	 */
	get(key) {
		if (!this.s) {
			return null;
		}

		try {
			const storageValue = this.s.getItem(CLIENT_SIDE_STORAGE_INDEX_NAME) || null,
				storageResult = null === storageValue ? null : window.JSON.parse(storageValue);

			return storageResult && !isUnd(storageResult[key]) ? storageResult[key] : null;
		} catch (e) {} // eslint-disable-line no-empty

		return null;
	}

	/**
	 * @returns {boolean}
	 */
	static supported() {
		return isStorageSupported('localStorage');
	}
}

export { LocalStorageDriver, LocalStorageDriver as default };
