
import {window} from 'common';
import Utils from 'Common/Utils';

class SettingsStorage
{
	constructor() {
		this.settings = window['rainloopAppData'] || {};
		this.settings = Utils.isNormal(this.settings) ? this.settings : {};	
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
	 * @return {boolean}
	 */
	capa(name) {
		const values = this.settingsGet('Capa');
		return Utils.isArray(values) && Utils.isNormal(name) && -1 < Utils.inArray(name, values);
	};
}

module.exports = new SettingsStorage();
