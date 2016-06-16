
import window from 'window';
import JSON from 'JSON';

const STORAGE_KEY = '__rlA';
const TIME_KEY = '__rlT';

const SESS_STORAGE = window.sessionStorage || null;
const WIN_STORAGE = window.top || window || null;

const __get = (key) => {

	let result = null;
	if (SESS_STORAGE)
	{
		result = SESS_STORAGE.getItem(key) || null;
	}
	else if (WIN_STORAGE && JSON)
	{
		const data = WIN_STORAGE.name && '{' === WIN_STORAGE.name.toString().substr(0, 1) ? JSON.parse(WIN_STORAGE.name.toString()) : null;
		result = data ? (data[key] || null) : null;
	}

	return result;
};

const __set = (key, value) => {

	if (SESS_STORAGE)
	{
		SESS_STORAGE.setItem(key, value);
	}
	else if (WIN_STORAGE && JSON)
	{
		let data = WIN_STORAGE.name && '{' === WIN_STORAGE.name.toString().substr(0, 1) ? JSON.parse(WIN_STORAGE.name.toString()) : null;
		data = data || {};
		data[key] = value;

		WIN_STORAGE.name = JSON.stringify(data);
	}
};

const timestamp = () => window.Math.round((new window.Date()).getTime() / 1000);

const setTimestamp = () => __set(TIME_KEY, timestamp());

const getTimestamp = () => {
	let time = __get(TIME_KEY, 0);
	return time ? (window.parseInt(time, 10) || 0) : 0;
};

/**
 * @return {string}
 */
export function getHash()
{
	return __get(STORAGE_KEY);
}

export function setHash()
{
	const
		key = 'AuthAccountHash',
		appData = window.__rlah_data()
	;

	__set(STORAGE_KEY, appData && appData[key] ? appData[key] : '');
	setTimestamp();
}

export function clearHash()
{
	__set(STORAGE_KEY, '');
	setTimestamp();
}

export function checkTimestamp()
{
	if (timestamp() > getTimestamp() + 1000 * 60 * 60) // 60m
	{
		clearHash();
		return true;
	}
	return false;
}

// init section
window.setInterval(() => {
	setTimestamp();
}, 1000 * 60); // 1m
