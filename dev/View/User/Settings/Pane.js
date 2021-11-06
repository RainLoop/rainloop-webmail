import { mailbox } from 'Common/Links';
import { getFolderInboxName } from 'Common/Cache';
import { leftPanelDisabled } from 'Common/Globals';

import { MessageUserStore } from 'Stores/User/Message';
import { ThemeStore } from 'Stores/Theme';

import { AbstractViewRight } from 'Knoin/AbstractViews';

export class PaneSettingsUserView extends AbstractViewRight {
	constructor() {
		super('SettingsPane');

		this.isMobile = ThemeStore.isMobile;
		this.leftPanelDisabled = leftPanelDisabled;
	}

	onShow() {
		MessageUserStore.message(null);
	}

	onBuild(dom) {
		dom.addEventListener('click', () =>
			ThemeStore.isMobile() && !event.target.closestWithin('.toggleLeft', dom) && leftPanelDisabled(true)
		);
	}

	backToMailBoxClick() {
		rl.route.setHash(mailbox(getFolderInboxName()));
	}
}
