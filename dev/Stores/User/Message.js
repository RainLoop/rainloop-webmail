import { Scope } from 'Common/Enums';
import { elementById, exitFullscreen } from 'Common/Globals';
import { addObservablesTo, addSubscribablesTo } from 'External/ko';

import { AppUserStore } from 'Stores/User/App';
import { SettingsUserStore } from 'Stores/User/Settings';

export const MessageUserStore = new class {
	constructor() {
		addObservablesTo(this, {
			// message viewer
			message: null,
			error: '',
			loading: false,

			// Cache mail bodies
			bodiesDom: null,
			activeDom: null
		});

		// Subscribers

		addSubscribablesTo(this, {
			message: message => {
				clearTimeout(this.MessageSeenTimer);
				elementById('rl-right').classList.toggle('message-selected', !!message);
				if (message) {
					if (!SettingsUserStore.usePreviewPane()) {
						AppUserStore.focusedState(Scope.MessageView);
					}
				} else {
					AppUserStore.focusedState(Scope.MessageList);
					exitFullscreen();
					this.hideMessageBodies();
				}
			},
		});

		this.purgeMessageBodyCache = this.purgeMessageBodyCache.throttle(30000);
	}

	purgeMessageBodyCache() {
		const messagesDom = this.bodiesDom(),
			children = messagesDom && messagesDom.children;
		if (children) {
			while (15 < children.length) {
				children[0].remove();
			}
		}
	}

	hideMessageBodies() {
		const messagesDom = this.bodiesDom();
		messagesDom && Array.from(messagesDom.children).forEach(el => el.hidden = true);
	}
};
