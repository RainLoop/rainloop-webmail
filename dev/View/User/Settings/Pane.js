import { mailbox } from 'Common/Links';
import { getFolderInboxName } from 'Common/Cache';
import { leftPanelDisabled, isMobile } from 'Common/Globals';

import MessageStore from 'Stores/User/Message';

import { AbstractViewRight } from 'Knoin/AbstractViews';

export class PaneSettingsUserView extends AbstractViewRight {
	constructor() {
		super('User/Settings/Pane', 'SettingsPane');

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
		isMobile() && dom.addEventListener('click', () => leftPanelDisabled(true));
	}

	backToMailBoxClick() {
		rl.route.setHash(mailbox(getFolderInboxName()));
	}
}
