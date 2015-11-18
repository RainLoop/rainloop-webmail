
import {_} from 'common';
import Utils from 'Common/Utils';
import Globals from 'Common/Globals';
import Settings from 'Storage/Settings';

class Plugins
{
	oSimpleHooks = {};
	aUserViewModelsHooks = [];
	aAdminViewModelsHooks = [];

	constructor() {}

	/**
	 * @param {string} name
	 * @param {Function} callback
	 */
	addHook(name, callback) {
		if (Utils.isFunc(callback))
		{
			if (!Utils.isArray(this.oSimpleHooks[name]))
			{
				this.oSimpleHooks[name] = [];
			}

			this.oSimpleHooks[name].push(callback);
		}
	}

	/**
	 * @param {string} name
	 * @param {Array=} args
	 */
	runHook(name, args = []) {
		if (Utils.isArray(this.oSimpleHooks[name]))
		{
			_.each(this.oSimpleHooks[name], (callback) => {
				callback.apply(null, args);
			});
		}
	}

	/**
	 * @param {string} name
	 * @return {?}
	 */
	mainSettingsGet(name) {
		return Settings.settingsGet(name);
	}

	/**
	 * @param {Function} callback
	 * @param {string} action
	 * @param {Object=} parameters
	 * @param {?number=} timeout
	 */
	remoteRequest(callback, action, parameters, timeout) {
		if (Globals.__APP__)
		{
			Globals.__APP__.remote().defaultRequest(callback, 'Plugin' + action, parameters, timeout);
		}
	}

	/**
	 * @param {Function} SettingsViewModelClass
	 * @param {string} labelName
	 * @param {string} template
	 * @param {string} route
	 */
	addSettingsViewModel(SettingsViewModelClass, template, labelName, route) {
		this.aUserViewModelsHooks.push([SettingsViewModelClass, template, labelName, route]);
	}

	/**
	 * @param {Function} SettingsViewModelClass
	 * @param {string} labelName
	 * @param {string} template
	 * @param {string} route
	 */
	addSettingsViewModelForAdmin(SettingsViewModelClass, template, labelName, route) {
		this.aAdminViewModelsHooks.push([SettingsViewModelClass, template, labelName, route]);
	}

	/**
	 * @param {boolean} admin
	 */
	runSettingsViewModelHooks(admin) {
		const Knoin = require('Knoin/Knoin');
		_.each(admin ? this.aAdminViewModelsHooks : this.aUserViewModelsHooks, (view) => {
			Knoin.addSettingsViewModel(view[0], view[1], view[2], view[3]);
		});
	}

	/**
	 * @param {string} pluginSection
	 * @param {string} name
	 * @return {?}
	 */
	settingsGet(pluginSection, name) {
		let plugins = Settings.settingsGet('Plugins');
		plugins = plugins && !Utils.isUnd(plugins[pluginSection]) ? plugins[pluginSection] : null;
		return plugins ? (Utils.isUnd(plugins[name]) ? null : plugins[name]) : null;
	}
}

module.exports = new Plugins();
