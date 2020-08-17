let SETTINGS = window.__rlah_data() || null;
SETTINGS = null != SETTINGS ? SETTINGS : {};

let APP_SETTINGS = SETTINGS.System || null;
APP_SETTINGS = null != APP_SETTINGS ? APP_SETTINGS : {};

/**
 * @param {string} name
 * @returns {*}
 */
export function settingsGet(name) {
	return undefined === SETTINGS[name] ? null : SETTINGS[name];
}

/**
 * @param {string} name
 * @param {*} value
 */
export function settingsSet(name, value) {
	SETTINGS[name] = value;
}

/**
 * @param {string} name
 * @returns {*}
 */
export function appSettingsGet(name) {
	return undefined === APP_SETTINGS[name] ? null : APP_SETTINGS[name];
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function capa(name) {
	const values = settingsGet('Capa');
	return Array.isArray(values) && null != name && values.includes(name);
}
