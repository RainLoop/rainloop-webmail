import ko from 'ko';

import { Notification } from 'Common/Enums';
import { SettingsGet } from 'Common/Globals';
import { getNotification } from 'Common/Translator';

import { showScreenPopup } from 'Knoin/Knoin';

import { PluginAdminStore } from 'Stores/Admin/Plugin';

import Remote from 'Remote/Admin/Fetch';

import { PluginPopupView } from 'View/Popup/Plugin';

export class PluginsAdminSettings
{
	constructor() {
		this.enabledPlugins = ko.observable(!!SettingsGet('EnabledPlugins'));

		this.plugins = PluginAdminStore;
		this.pluginsError = PluginAdminStore.error;

		this.enabledPlugins.subscribe(value =>
			Remote.saveAdminConfig(null, {
				EnabledPlugins: value ? 1 : 0
			})
		);
	}

	disablePlugin(plugin) {
		let b = !plugin.disabled();
		plugin.disabled(b);
		Remote.pluginDisable((iError, data) => {
			if (iError) {
				PluginAdminStore.error(
					(Notification.UnsupportedPluginPackage === iError && data && data.ErrorMessage)
					? data.ErrorMessage
					: getNotification(iError)
				);
			}
			PluginAdminStore.fetch();
		}, plugin.name, b);
	}

	configurePlugin(plugin) {
		Remote.plugin((iError, data) => iError || showScreenPopup(PluginPopupView, [data.Result]), plugin.name);
	}

	onBuild(oDom) {
		oDom.addEventListener('click', event => {
			let el = event.target.closestWithin('.configure-plugin-action', oDom);
			el && ko.dataFor(el) && this.configurePlugin(ko.dataFor(el));

			el = event.target.closestWithin('.disabled-plugin', oDom);
			el && ko.dataFor(el) && this.disablePlugin(ko.dataFor(el));
		});
	}

	onShow() {
		PluginAdminStore.error('');
		PluginAdminStore.fetch();
	}
}
