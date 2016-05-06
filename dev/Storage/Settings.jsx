
import {window} from 'common';
import Utils from 'Common/Utils';

class SettingsStorage
{
	settings = {};
	appSettings = {};

	constructor() {
		this.settings = window.rainloopAppData || {};
		this.settings = Utils.isNormal(this.settings) ? this.settings : {};

		this.appSettings = this.settings.System || null;
		this.appSettings = Utils.isNormal(this.appSettings) ? this.appSettings : {};
	}

	/**
	 * @param {string} name
	 * @return {*}
	 */
	settingsGet(name) {
		return Utils.isUnd(this.settings[name]) ? null : this.settings[name];
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
		return Utils.isUnd(this.appSettings[name]) ? null : this.appSettings[name];
	}

	/**
	 * @param {string} name
	 * @return {boolean}
	 */
	capa(name) {
		const values = this.settingsGet('Capa');
		return Utils.isArray(values) && Utils.isNormal(name) && -1 < Utils.inArray(name, values);
	}
}

module.exports = new SettingsStorage();
