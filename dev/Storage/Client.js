const
CLIENT_SIDE_STORAGE_INDEX_NAME = 'rlcsc',
getStorage = () => {
	try {
		const value = localStorage.getItem(CLIENT_SIDE_STORAGE_INDEX_NAME);
		return value ? JSON.parse(value) : null;
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
		localStorage.setItem(CLIENT_SIDE_STORAGE_INDEX_NAME, JSON.stringify(storageResult));
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
		return (getStorage() || {})['p' + key];
	} catch (e) {
		return null;
	}
}
