import ko from 'ko';
import { koComputable } from 'External/ko';

import Remote from 'Remote/Admin/Fetch';

import { PackageAdminStore } from 'Stores/Admin/Package';

import { AbstractViewRight } from 'Knoin/AbstractViews';

import { leftPanelDisabled, Settings } from 'Common/Globals';

class PaneSettingsAdminView extends AbstractViewRight {
	constructor() {
		super('AdminPane');

		this.version = ko.observable(Settings.app('version'));

		this.leftPanelDisabled = leftPanelDisabled;

		this.adminManLoadingVisibility = koComputable(() => PackageAdminStore.loading() ? 'visible' : 'hidden');
	}

	logoutClick() {
		Remote.request('AdminLogout', () => rl.logoutReload());
	}
}

export { PaneSettingsAdminView };
