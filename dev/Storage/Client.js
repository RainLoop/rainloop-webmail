import { CLIENT_SIDE_STORAGE_INDEX_NAME } from 'Common/Consts';

const storage = localStorage;

/**
 * @param {number} key
 * @param {*} data
 * @returns {boolean}
 */
export function set(key, data) {
	let storageResult = null;
	try {
		const storageValue = storage.getItem(CLIENT_SIDE_STORAGE_INDEX_NAME) || null;
		storageResult = null === storageValue ? null : JSON.parse(storageValue);
	} catch (e) {} // eslint-disable-line no-empty

	(storageResult || (storageResult = {}))['p' + key] = data;

	try {
		storage.setItem(CLIENT_SIDE_STORAGE_INDEX_NAME, JSON.stringify(storageResult));
		return true;
	} catch (e) {} // eslint-disable-line no-empty

	return false;
}

/**
 * @param {number} key
 * @returns {*}
 */
export function get(key) {
	try {
		key = 'p' + key;
		const storageValue = storage.getItem(CLIENT_SIDE_STORAGE_INDEX_NAME) || null,
			storageResult = null === storageValue ? null : JSON.parse(storageValue);

		return storageResult && null != storageResult[key] ? storageResult[key] : null;
	} catch (e) {} // eslint-disable-line no-empty

	return null;
}
