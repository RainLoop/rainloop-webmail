import _ from '_';
import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';
import { boolToAjax } from 'Common/Utils';

import { settingsGet } from 'Storage/Settings';
import { showScreenPopup } from 'Knoin/Knoin';

import AppStore from 'Stores/Admin/App';
import PluginStore from 'Stores/Admin/Plugin';

import Remote from 'Remote/Admin/Ajax';

import { getApp } from 'Helper/Apps/Admin';

class PluginsAdminSettings {
	constructor() {
		this.enabledPlugins = ko.observable(!!settingsGet('EnabledPlugins'));

		this.plugins = PluginStore.plugins;
		this.pluginsError = PluginStore.plugins.error;

		this.community = RL_COMMUNITY || AppStore.community();

		this.visibility = ko.computed(() => (PluginStore.plugins.loading() ? 'visible' : 'hidden'));

		this.onPluginLoadRequest = _.bind(this.onPluginLoadRequest, this);
		this.onPluginDisableRequest = _.bind(this.onPluginDisableRequest, this);
	}

	disablePlugin(plugin) {
		plugin.disabled(!plugin.disabled());
		Remote.pluginDisable(this.onPluginDisableRequest, plugin.name, plugin.disabled());
	}

	configurePlugin(plugin) {
		Remote.plugin(this.onPluginLoadRequest, plugin.name);
	}

	onBuild(oDom) {
		const self = this;

		oDom
			.on('click', '.e-item .configure-plugin-action', function() {
				// eslint-disable-line prefer-arrow-callback
				const plugin = ko.dataFor(this); // eslint-disable-line no-invalid-this
				if (plugin) {
					self.configurePlugin(plugin);
				}
			})
			.on('click', '.e-item .disabled-plugin', function() {
				// eslint-disable-line prefer-arrow-callback
				const plugin = ko.dataFor(this); // eslint-disable-line no-invalid-this
				if (plugin) {
					self.disablePlugin(plugin);
				}
			});

		this.enabledPlugins.subscribe((value) => {
			Remote.saveAdminConfig(null, {
				'EnabledPlugins': boolToAjax(value)
			});
		});
	}

	onShow() {
		PluginStore.plugins.error('');
		getApp().reloadPluginList();
	}

	onPluginLoadRequest(result, data) {
		if (StorageResultType.Success === result && data && data.Result) {
			showScreenPopup(require('View/Popup/Plugin'), [data.Result]);
		}
	}

	onPluginDisableRequest(result, data) {
		if (StorageResultType.Success === result && data) {
			if (!data.Result && data.ErrorCode) {
				if (Notification.UnsupportedPluginPackage === data.ErrorCode && data.ErrorMessage && '' !== data.ErrorMessage) {
					PluginStore.plugins.error(data.ErrorMessage);
				} else {
					PluginStore.plugins.error(getNotification(data.ErrorCode));
				}
			}
		}

		getApp().reloadPluginList();
	}
}

export { PluginsAdminSettings, PluginsAdminSettings as default };
