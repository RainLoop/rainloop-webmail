import ko from 'ko';

import { Notification } from 'Common/Enums';
import { SettingsGet } from 'Common/Globals';
import { getNotification } from 'Common/Translator';

import { showScreenPopup } from 'Knoin/Knoin';

import { PluginAdminStore } from 'Stores/Admin/Plugin';

import Remote from 'Remote/Admin/Fetch';

import { PluginPopupView } from 'View/Popup/Plugin';

export class PluginsAdminSettings {
	constructor() {
		this.enabledPlugins = ko.observable(!!SettingsGet('EnabledPlugins'));

		this.plugins = PluginAdminStore;
		this.pluginsError = PluginAdminStore.error;

		this.onPluginLoadRequest = this.onPluginLoadRequest.bind(this);
		this.onPluginDisableRequest = this.onPluginDisableRequest.bind(this);

		this.enabledPlugins.subscribe(value =>
			Remote.saveAdminConfig(null, {
				'EnabledPlugins': value ? 1 : 0
			})
		);
	}

	disablePlugin(plugin) {
		plugin.disabled(!plugin.disabled());
		Remote.pluginDisable(this.onPluginDisableRequest, plugin.name, plugin.disabled());
	}

	configurePlugin(plugin) {
		Remote.plugin(this.onPluginLoadRequest, plugin.name);
	}

	onBuild(oDom) {
		oDom.addEventListener('click', event => {
			let el = event.target.closestWithin('.e-item .configure-plugin-action', oDom);
			el && ko.dataFor(el) && this.configurePlugin(ko.dataFor(el));

			el = event.target.closestWithin('.e-item .disabled-plugin', oDom);
			el && ko.dataFor(el) && this.disablePlugin(ko.dataFor(el));
		});
	}

	onShow() {
		PluginAdminStore.error('');
		PluginAdminStore.fetch();
	}

	onPluginLoadRequest(iError, data) {
		if (!iError) {
			showScreenPopup(PluginPopupView, [data.Result]);
		}
	}

	onPluginDisableRequest(iError, data) {
		if (iError) {
			if (Notification.UnsupportedPluginPackage === iError && data && data.ErrorMessage) {
				PluginAdminStore.error(data.ErrorMessage);
			} else {
				PluginAdminStore.error(getNotification(iError));
			}
		}

		PluginAdminStore.fetch();
	}
}
