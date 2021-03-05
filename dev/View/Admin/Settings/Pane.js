import ko from 'ko';

import Remote from 'Remote/Admin/Fetch';

import { DomainAdminStore } from 'Stores/Admin/Domain';
import { PluginAdminStore } from 'Stores/Admin/Plugin';
import { PackageAdminStore } from 'Stores/Admin/Package';

import { AbstractViewRight } from 'Knoin/AbstractViews';

import { leftPanelDisabled } from 'Common/Globals';

class PaneSettingsAdminView extends AbstractViewRight {
	constructor() {
		super('Admin/Settings/Pane', 'AdminPane');

		this.version = ko.observable(rl.settings.app('version'));

		this.leftPanelDisabled = leftPanelDisabled;

		this.adminManLoadingVisibility = ko
			.computed(() => (DomainAdminStore.loading()
				|| PluginAdminStore.loading()
				|| PackageAdminStore.loading()) ? 'visible' : 'hidden')
			.extend({ rateLimit: 300 });
	}

	toggleLeft(item, event) {
		event.preventDefault();
		event.stopPropagation();
		leftPanelDisabled(!leftPanelDisabled());
	}

	logoutClick() {
		Remote.adminLogout(() => rl.logoutReload());
	}
}

export { PaneSettingsAdminView };
