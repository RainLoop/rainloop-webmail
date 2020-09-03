let SETTINGS = RainLoop.data() || null;
SETTINGS = null != SETTINGS ? SETTINGS : {};

/**
 * @param {string} name
 * @returns {*}
 */
export function settingsGet(name) {
	return null == SETTINGS[name] ? null : SETTINGS[name];
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
	const APP_SETTINGS = SETTINGS.System || {};
	return null == APP_SETTINGS[name] ? null : APP_SETTINGS[name];
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function capa(name) {
	const values = SETTINGS.Capa;
	return Array.isArray(values) && null != name && values.includes(name);
}
