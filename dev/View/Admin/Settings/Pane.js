import Remote from 'Remote/Admin/Fetch';

import { AbstractViewRight } from 'Knoin/AbstractViews';

import { leftPanelDisabled } from 'Common/Globals';

export class PaneSettingsAdminView extends AbstractViewRight {
	constructor() {
		super('AdminPane');
		this.leftPanelDisabled = leftPanelDisabled;
	}

	logoutClick() {
		Remote.request('AdminLogout', () => rl.logoutReload());
	}
}
