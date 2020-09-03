const STORAGE_KEY = '__rlA';
const TIME_KEY = '__rlT';

const storage = ()=>window.sessionStorage;

const timestamp = () => Math.round(Date.now() / 1000);

const setTimestamp = () => storage().setItem(TIME_KEY, timestamp());

/**
 * @returns {string}
 */
export function getHash() {
	return storage().getItem(STORAGE_KEY) || null;
}

/**
 * @returns {void}
 */
export function setHash() {
	const key = 'AuthAccountHash',
		appData = window.__rlah_data();

	storage().setItem(STORAGE_KEY, appData && appData[key] ? appData[key] : '');
	setTimestamp();
}

/**
 * @returns {void}
 */
export function clearHash() {
	storage().setItem(STORAGE_KEY, '');
	setTimestamp();
}

/**
 * @returns {boolean}
 */
export function checkTimestamp() {
	if (timestamp() > (parseInt(storage().getItem(TIME_KEY) || 0, 10) || 0) + 3600000) {
		// 60m
		clearHash();
		return true;
	}
	return false;
}

// init section
setInterval(setTimestamp, 60000); // 1m
