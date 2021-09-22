import ko from 'ko';

import { SettingsGet } from 'Common/Globals';
import { ContactUserStore } from 'Stores/User/Contact';
import Remote from 'Remote/User/Fetch';

export class ContactsUserSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.contactsAutosave = ko.observable(!!SettingsGet('ContactsAutosave'));

		this.allowContactsSync = ContactUserStore.allowSync;
		this.enableContactsSync = ContactUserStore.enableSync;
		this.contactsSyncUrl = ContactUserStore.syncUrl;
		this.contactsSyncUser = ContactUserStore.syncUser;
		this.contactsSyncPass = ContactUserStore.syncPass;

		this.saveTrigger = ko
			.computed(() =>
				[
					ContactUserStore.enableSync() ? '1' : '0',
					ContactUserStore.syncUrl(),
					ContactUserStore.syncUser(),
					ContactUserStore.syncPass()
				].join('|')
			)
			.extend({ debounce: 500 });

		this.contactsAutosave.subscribe(value =>
			Remote.saveSettings(null, {
				ContactsAutosave: value ? 1 : 0
			})
		);

		this.saveTrigger.subscribe(() =>
			Remote.saveContactsSyncData(
				null,
				ContactUserStore.enableSync(),
				ContactUserStore.syncUrl(),
				ContactUserStore.syncUser(),
				ContactUserStore.syncPass()
			)
		);
	}
}
