import { mailbox } from 'Common/Links';
import { getFolderInboxName } from 'Common/Cache';
import { leftPanelDisabled, toggleLeftPanel } from 'Common/Globals';

import { MessageUserStore } from 'Stores/User/Message';
import { ThemeStore } from 'Stores/Theme';

import { AbstractViewRight } from 'Knoin/AbstractViews';

export class SettingsPaneUserView extends AbstractViewRight {
	constructor() {
		super();

		this.isMobile = ThemeStore.isMobile;
		this.leftPanelDisabled = leftPanelDisabled;
		this.toggleLeftPanel = toggleLeftPanel;
	}

	onShow() {
		MessageUserStore.message(null);
	}

	onBuild(dom) {
		dom.addEventListener('click', () =>
			ThemeStore.isMobile() && !event.target.closestWithin('.toggleLeft', dom) && leftPanelDisabled(true)
		);
	}

	backToInbox() {
		hasher.setHash(mailbox(getFolderInboxName()));
	}
}
