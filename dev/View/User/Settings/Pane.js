import { inbox } from 'Common/Links';
import { getFolderInboxName } from 'Common/Cache';
import { leftPanelDisabled } from 'Common/Globals';

import MessageStore from 'Stores/User/Message';

import { AbstractViewRight } from 'Knoin/AbstractViews';

class PaneSettingsUserView extends AbstractViewRight {
	constructor() {
		super('User/Settings/Pane', 'SettingsPane');

		this.mobile = rl.settings.app('mobile');

		this.leftPanelDisabled = leftPanelDisabled;
	}

	onShow() {
		MessageStore.message(null);
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

	onBuild(dom) {
		this.mobile && dom.addEventListener('click', () => leftPanelDisabled(true));
	}

	backToMailBoxClick() {
		rl.route.setHash(inbox(getFolderInboxName()));
	}
}

export { PaneSettingsUserView };
