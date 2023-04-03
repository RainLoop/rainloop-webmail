import { ScopeMessageList, ScopeMessageView } from 'Common/Enums';
import { elementById } from 'Common/Globals';
import { exitFullscreen } from 'Common/Fullscreen';
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
			bodiesDom: null
		});

		// Subscribers

		addSubscribablesTo(this, {
			message: message => {
				clearTimeout(this.MessageSeenTimer);
				elementById('rl-right').classList.toggle('message-selected', !!message);
				if (message) {
					SettingsUserStore.usePreviewPane() || AppUserStore.focusedState(ScopeMessageView);
				} else {
					AppUserStore.focusedState(ScopeMessageList);
					exitFullscreen();
				}
				[...(this.bodiesDom()?.children || [])].forEach(el => el.hidden = true);
			},
		});

		this.purgeCache = this.purgeCache.throttle(30000);
	}

	purgeCache(all) {
		const children = this.bodiesDom()?.children || [];
		let i = Math.max(0, children.length - (all ? 0 : 15));
		while (i--) {
			children[i].remove();
			if (children[i].message) {
				children[i].message.body = null;
			}
		}
	}
};
