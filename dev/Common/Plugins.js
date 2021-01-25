import * as Knoin from 'Knoin/Knoin';

const USER_VIEW_MODELS_HOOKS = [],
	ADMIN_VIEW_MODELS_HOOKS = [];

/**
 * @param {string} name
 * @returns {?}
 */
export function mainSettingsGet(name) {
	return rl.settings.get(name);
}

/**
 * @param {Function} callback
 * @param {string} action
 * @param {Object=} parameters
 * @param {?number=} timeout
 */
export function remoteRequest(callback, action, parameters, timeout) {
	if (rl.app) {
		rl.app.remote().defaultRequest(callback, 'Plugin' + action, parameters, timeout);
	}
}

/**
 * @param {Function} SettingsViewModelClass
 * @param {string} labelName
 * @param {string} template
 * @param {string} route
 */
export function addSettingsViewModel(SettingsViewModelClass, template, labelName, route) {
	USER_VIEW_MODELS_HOOKS.push([SettingsViewModelClass, template, labelName, route]);
}

/**
 * @param {Function} SettingsViewModelClass
 * @param {string} labelName
 * @param {string} template
 * @param {string} route
 */
export function addSettingsViewModelForAdmin(SettingsViewModelClass, template, labelName, route) {
	ADMIN_VIEW_MODELS_HOOKS.push([SettingsViewModelClass, template, labelName, route]);
}

/**
 * @param {boolean} admin
 */
export function runSettingsViewModelHooks(admin) {
	(admin ? ADMIN_VIEW_MODELS_HOOKS : USER_VIEW_MODELS_HOOKS).forEach(view => {
		Knoin.settingsAddViewModel(view[0], view[1], view[2], view[3]);
	});
}

/**
 * @param {string} pluginSection
 * @param {string} name
 * @returns {?}
 */
export function settingsGet(pluginSection, name) {
	let plugins = rl.settings.get('Plugins');
	plugins = plugins && null != plugins[pluginSection] ? plugins[pluginSection] : null;
	return plugins ? (null == plugins[name] ? null : plugins[name]) : null;
}
