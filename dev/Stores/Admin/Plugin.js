import ko from 'ko';
import Remote from 'Remote/Admin/Fetch';

export const PluginAdminStore = ko.observableArray();

PluginAdminStore.loading = ko.observable(false);

PluginAdminStore.error = ko.observable('');

PluginAdminStore.fetch = () => {
	PluginAdminStore.loading(true);
	Remote.pluginList((iError, data) => {
		PluginAdminStore.loading(false);
		if (!iError && data && data.Result) {
			PluginAdminStore(
				data.Result.map(item => ({
					name: item.Name,
					disabled: ko.observable(!item.Enabled),
					configured: ko.observable(!!item.Configured)
				}))
			);
		}
	});
};
