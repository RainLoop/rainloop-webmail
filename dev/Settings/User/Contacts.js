import ko from 'ko';

import { Magics } from 'Common/Enums';
import { boolToAjax } from 'Common/Utils';

import AppStore from 'Stores/User/App';
import ContactStore from 'Stores/User/Contact';
import Remote from 'Remote/User/Ajax';

class ContactsUserSettings {
	constructor() {
		this.contactsAutosave = AppStore.contactsAutosave;

		this.allowContactsSync = ContactStore.allowContactsSync;
		this.enableContactsSync = ContactStore.enableContactsSync;
		this.contactsSyncUrl = ContactStore.contactsSyncUrl;
		this.contactsSyncUser = ContactStore.contactsSyncUser;
		this.contactsSyncPass = ContactStore.contactsSyncPass;

		this.saveTrigger = ko
			.computed(() =>
				[
					this.enableContactsSync() ? '1' : '0',
					this.contactsSyncUrl(),
					this.contactsSyncUser(),
					this.contactsSyncPass()
				].join('|')
			)
			.extend({ throttle: Magics.Time500ms });
	}

	onBuild() {
		this.contactsAutosave.subscribe((value) => {
			Remote.saveSettings(null, {
				'ContactsAutosave': boolToAjax(value)
			});
		});

		this.saveTrigger.subscribe(() => {
			Remote.saveContactsSyncData(
				null,
				this.enableContactsSync(),
				this.contactsSyncUrl(),
				this.contactsSyncUser(),
				this.contactsSyncPass()
			);
		});
	}
}

export { ContactsUserSettings, ContactsUserSettings as default };
