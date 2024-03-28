import Remote from 'Remote/Admin/Fetch';

import { AbstractViewRight } from 'Knoin/AbstractViews';

import { toggleLeftPanel } from 'Common/Globals';

export class PaneSettingsAdminView extends AbstractViewRight {
	constructor() {
		super('AdminPane');
		this.toggleLeftPanel = toggleLeftPanel;
	}

	logoutClick() {
		Remote.request('AdminLogout', () => rl.logoutReload());
	}
}
