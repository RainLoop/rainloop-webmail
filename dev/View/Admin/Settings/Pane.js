import ko from 'ko';

import Remote from 'Remote/Admin/Fetch';

import DomainStore from 'Stores/Admin/Domain';
import PluginStore from 'Stores/Admin/Plugin';
import PackageStore from 'Stores/Admin/Package';

import { AbstractViewRight } from 'Knoin/AbstractViews';

class PaneSettingsAdminView extends AbstractViewRight {
	constructor() {
		super('Admin/Settings/Pane', 'AdminPane');

		this.version = ko.observable(rl.settings.app('version'));

		this.adminManLoading = ko.computed(
			() =>
				'000' !==
				[
					DomainStore.domains.loading() ? '1' : '0',
					PluginStore.plugins.loading() ? '1' : '0',
					PackageStore.packages.loading() ? '1' : '0'
				].join('')
		);

		this.adminManLoadingVisibility = ko
			.computed(() => (this.adminManLoading() ? 'visible' : 'hidden'))
			.extend({ rateLimit: 300 });
	}

	logoutClick() {
		Remote.adminLogout(() => rl.logoutReload());
	}
}

export { PaneSettingsAdminView };
