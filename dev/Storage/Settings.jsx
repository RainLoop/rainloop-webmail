
import {window} from 'common';
import {isUnd, isNormal, isArray, inArray} from 'Common/Utils';

class SettingsStorage
{
	settings = {};
	appSettings = {};

	constructor() {
		this.settings = window.__rlah_data() || {};
		this.settings = isNormal(this.settings) ? this.settings : {};

		this.appSettings = this.settings.System || null;
		this.appSettings = isNormal(this.appSettings) ? this.appSettings : {};
	}

	/**
	 * @param {string} name
	 * @return {*}
	 */
	settingsGet(name) {
		return isUnd(this.settings[name]) ? null : this.settings[name];
	}

	/**
	 * @param {string} name
	 * @param {*} value
	 */
	settingsSet(name, value) {
		this.settings[name] = value;
	}

	/**
	 * @param {string} name
	 * @return {*}
	 */
	appSettingsGet(name) {
		return isUnd(this.appSettings[name]) ? null : this.appSettings[name];
	}

	/**
	 * @param {string} name
	 * @return {boolean}
	 */
	capa(name) {
		const values = this.settingsGet('Capa');
		return isArray(values) && isNormal(name) && -1 < inArray(name, values);
	}
}

module.exports = new SettingsStorage();
