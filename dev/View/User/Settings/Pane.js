import { mailbox } from 'Common/Links';
import { getFolderInboxName } from 'Common/Cache';
import { leftPanelDisabled } from 'Common/Globals';

import { MessageUserStore } from 'Stores/User/Message';
import { ThemeStore } from 'Stores/Theme';

import { AbstractViewRight } from 'Knoin/AbstractViews';

export class PaneSettingsUserView extends AbstractViewRight {
	constructor() {
		super('SettingsPane');

		this.leftPanelDisabled = leftPanelDisabled;
	}

	onShow() {
		MessageUserStore.message(null);
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
		dom.addEventListener('click', () => ThemeStore.isMobile() && leftPanelDisabled(true));
	}

	backToMailBoxClick() {
		rl.route.setHash(mailbox(getFolderInboxName()));
	}
}
