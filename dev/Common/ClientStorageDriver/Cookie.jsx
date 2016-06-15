
import {window, JSON, $} from 'common';
import {isUnd} from 'Common/Utils';
import {CLIENT_SIDE_STORAGE_INDEX_NAME} from 'Common/Consts';

class CookieDriver
{
	/**
	 * @param {string} key
	 * @param {*} data
	 * @return {boolean}
	 */
	set(key, data) {

		let
			result = false,
			storageResult = null
		;

		try
		{
			const storageValue = $.cookie(CLIENT_SIDE_STORAGE_INDEX_NAME);
			storageResult = null === storageValue ? null : JSON.parse(storageValue);
		}
		catch (e) {/* eslint-disable-line no-empty */}

		(storageResult || (storageResult = {}))[key] = data;

		try
		{
			$.cookie(CLIENT_SIDE_STORAGE_INDEX_NAME, JSON.stringify(storageResult), {
				expires: 30
			});

			result = true;
		}
		catch (e) {/* eslint-disable-line no-empty */}

		return result;
	}

	/**
	 * @param {string} key
	 * @return {*}
	 */
	get(key) {

		let result = null;

		try
		{
			const
				storageValue = $.cookie(CLIENT_SIDE_STORAGE_INDEX_NAME),
				storageResult = null === storageValue ? null : JSON.parse(storageValue)
			;

			result = (storageResult && !isUnd(storageResult[key])) ? storageResult[key] : null;
		}
		catch (e) {/* eslint-disable-line no-empty */}

		return result;
	}

	/**
	 * @return {boolean}
	 */
	static supported() {
		return !!(window.navigator && window.navigator.cookieEnabled);
	}
}

export {CookieDriver, CookieDriver as default};
