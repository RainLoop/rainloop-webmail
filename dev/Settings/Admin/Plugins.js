import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import { showScreenPopup } from 'Knoin/Knoin';

import { PluginAdminStore } from 'Stores/Admin/Plugin';

import Remote from 'Remote/Admin/Fetch';

import { PluginPopupView } from 'View/Popup/Plugin';

export class PluginsAdminSettings {
	constructor() {
		this.enabledPlugins = ko.observable(!!rl.settings.get('EnabledPlugins'));

		this.plugins = PluginAdminStore;
		this.pluginsError = PluginAdminStore.error;

		this.visibility = ko.computed(() => (PluginAdminStore.loading() ? 'visible' : 'hidden'));

		this.onPluginLoadRequest = this.onPluginLoadRequest.bind(this);
		this.onPluginDisableRequest = this.onPluginDisableRequest.bind(this);
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

		this.enabledPlugins.subscribe((value) => {
			Remote.saveAdminConfig(null, {
				'EnabledPlugins': value ? '1' : '0'
			});
		});
	}

	onShow() {
		PluginAdminStore.error('');
		rl.app.reloadPluginList();
	}

	onPluginLoadRequest(result, data) {
		if (StorageResultType.Success === result && data && data.Result) {
			showScreenPopup(PluginPopupView, [data.Result]);
		}
	}

	onPluginDisableRequest(result, data) {
		if (StorageResultType.Success === result && data) {
			if (!data.Result && data.ErrorCode) {
				if (Notification.UnsupportedPluginPackage === data.ErrorCode && data.ErrorMessage && data.ErrorMessage) {
					PluginAdminStore.error(data.ErrorMessage);
				} else {
					PluginAdminStore.error(getNotification(data.ErrorCode));
				}
			}
		}

		rl.app.reloadPluginList();
	}
}
