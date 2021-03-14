import ko from 'ko';
import Remote from 'Remote/Admin/Fetch';
import { StorageResultType } from 'Common/Enums';

export const PluginAdminStore = ko.observableArray();

PluginAdminStore.loading = ko.observable(false);

PluginAdminStore.error = ko.observable('');

PluginAdminStore.fetch = () => {
	PluginAdminStore.loading(true);
	Remote.pluginList((result, data) => {
		PluginAdminStore.loading(false);
		if (StorageResultType.Success === result && data && data.Result) {
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
