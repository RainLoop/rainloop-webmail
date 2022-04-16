import ko from 'ko';
import { koComputable } from 'External/ko';

import { SettingsGet } from 'Common/Globals';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';
import { ContactUserStore } from 'Stores/User/Contact';
import Remote from 'Remote/User/Fetch';

export class UserSettingsContacts /*extends AbstractViewSettings*/ {
	constructor() {
		this.contactsAutosave = ko.observable(!!SettingsGet('ContactsAutosave'));

		this.allowContactsSync = ContactUserStore.allowSync;
		this.syncMode = ContactUserStore.syncMode;
		this.syncUrl = ContactUserStore.syncUrl;
		this.syncUser = ContactUserStore.syncUser;
		this.syncPass = ContactUserStore.syncPass;

		const i18nSyncMode = key => i18n('SETTINGS_CONTACTS/SYNC_' + key);
		this.syncModeOptions = koComputable(() => {
			translatorTrigger();
			return [
				{ id: 0, name: i18nSyncMode('NO') },
				{ id: 1, name: i18nSyncMode('YES') },
				{ id: 2, name: i18nSyncMode('READ') },
			];
		});

		this.saveTrigger = koComputable(() =>
				[
					ContactUserStore.syncMode(),
					ContactUserStore.syncUrl(),
					ContactUserStore.syncUser(),
					ContactUserStore.syncPass()
				].join('|')
			)
			.extend({ debounce: 500 });

		this.contactsAutosave.subscribe(value =>
			Remote.saveSettings(null, { ContactsAutosave: value })
		);

		this.saveTrigger.subscribe(() =>
			Remote.request('SaveContactsSyncData', null, {
				Mode: ContactUserStore.syncMode(),
				Url: ContactUserStore.syncUrl(),
				User: ContactUserStore.syncUser(),
				Password: ContactUserStore.syncPass()
			})
		);
	}
}
