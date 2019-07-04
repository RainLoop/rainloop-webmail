import window from 'window';
import Cookies from 'js-cookie';
import { isUnd } from 'Common/Utils';
import { CLIENT_SIDE_STORAGE_INDEX_NAME } from 'Common/Consts';

class CookieDriver {
	/**
	 * @param {string} key
	 * @param {*} data
	 * @returns {boolean}
	 */
	set(key, data) {
		let result = false,
			storageResult = null;

		try {
			storageResult = Cookies.getJSON(CLIENT_SIDE_STORAGE_INDEX_NAME);
		} catch (e) {} // eslint-disable-line no-empty

		(storageResult || (storageResult = {}))[key] = data;

		try {
			Cookies.set(CLIENT_SIDE_STORAGE_INDEX_NAME, storageResult, {
				expires: 30
			});

			result = true;
		} catch (e) {} // eslint-disable-line no-empty

		return result;
	}

	/**
	 * @param {string} key
	 * @returns {*}
	 */
	get(key) {
		let result = null;

		try {
			const storageResult = Cookies.getJSON(CLIENT_SIDE_STORAGE_INDEX_NAME);
			result = storageResult && !isUnd(storageResult[key]) ? storageResult[key] : null;
		} catch (e) {} // eslint-disable-line no-empty

		return result;
	}

	/**
	 * @returns {boolean}
	 */
	static supported() {
		return !!(window.navigator && window.navigator.cookieEnabled);
	}
}

export { CookieDriver, CookieDriver as default };
