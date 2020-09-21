import { CLIENT_SIDE_STORAGE_INDEX_NAME } from 'Common/Consts';

const storage = localStorage,
getStorage = () => {
	try {
		const value = storage.getItem(CLIENT_SIDE_STORAGE_INDEX_NAME) || null;
		return null == value ? null : JSON.parse(value);
	} catch (e) {
		return null;
	}
};

/**
 * @param {number} key
 * @param {*} data
 * @returns {boolean}
 */
export function set(key, data) {
	const storageResult = getStorage() || {};
	storageResult['p' + key] = data;

	try {
		storage.setItem(CLIENT_SIDE_STORAGE_INDEX_NAME, JSON.stringify(storageResult));
		return true;
	} catch (e) {
		return false;
	}
}

/**
 * @param {number} key
 * @returns {*}
 */
export function get(key) {
	try {
		key = 'p' + key;
		const storageResult = getStorage();

		return storageResult && null != storageResult[key] ? storageResult[key] : null;
	} catch (e) {
		return null;
	}
}
