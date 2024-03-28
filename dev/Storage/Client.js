const
	win = window,
	CLIENT_SIDE_STORAGE_INDEX_NAME = 'rlcsc',
	sName = 'localStorage',
	getStorage = () => {
		try {
			const value = localStorage.getItem(CLIENT_SIDE_STORAGE_INDEX_NAME);
			return value ? JSON.parse(value) : null;
		} catch (e) {
			return null;
		}
	};

// Storage
try {
	win[sName].setItem(sName, '');
	win[sName].getItem(sName);
	win[sName].removeItem(sName);
} catch (e) {
	console.error(e);
	// initialise if there's already data
	let data = document.cookie.match(/(^|;) ?localStorage=([^;]+)/);
	data = data ? decodeURIComponent(data[2]) : null;
	data = data ? JSON.parse(data) : {};
	win[sName] = {
		getItem: key => data[key] == null ? null : data[key],
		setItem: (key, value) => {
			data[key] = ''+value; // forces the value to a string
			document.cookie = sName+'='+encodeURIComponent(JSON.stringify(data))
				+";expires="+((new Date(Date.now()+(365*24*60*60*1000))).toGMTString())
				+";path=/;samesite=strict";
		}
	};
}

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
