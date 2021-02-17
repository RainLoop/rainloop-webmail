import ko from 'ko';

import Remote from 'Remote/Admin/Fetch';

import DomainStore from 'Stores/Admin/Domain';
import PluginStore from 'Stores/Admin/Plugin';
import PackageStore from 'Stores/Admin/Package';

import { AbstractViewRight } from 'Knoin/AbstractViews';

import { leftPanelDisabled } from 'Common/Globals';

class PaneSettingsAdminView extends AbstractViewRight {
	constructor() {
		super('Admin/Settings/Pane', 'AdminPane');

		this.version = ko.observable(rl.settings.app('version'));

		this.leftPanelDisabled = leftPanelDisabled;

		this.adminManLoadingVisibility = ko
			.computed(() => (DomainStore.domains.loading()
				|| PluginStore.plugins.loading()
				|| PackageStore.packages.loading()) ? 'visible' : 'hidden')
			.extend({ rateLimit: 300 });
	}

	hideLeft(item, event) {
		event.preventDefault();
		event.stopPropagation();
		leftPanelDisabled(true);
	}

	showLeft(item, event) {
		event.preventDefault();
		event.stopPropagation();
		leftPanelDisabled(false);
	}

	logoutClick() {
		Remote.adminLogout(() => rl.logoutReload());
	}
}

export { PaneSettingsAdminView };
