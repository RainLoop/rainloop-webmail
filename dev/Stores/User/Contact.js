import ko from 'ko';
import { SettingsGet } from 'Common/Globals';

class ContactUserStore {
	constructor() {
		this.contacts = ko.observableArray();
		this.contacts.loading = ko.observable(false).extend({ debounce: 200 });
		this.contacts.importing = ko.observable(false).extend({ debounce: 200 });
		this.contacts.syncing = ko.observable(false).extend({ debounce: 200 });
		this.contacts.exportingVcf = ko.observable(false).extend({ debounce: 200 });
		this.contacts.exportingCsv = ko.observable(false).extend({ debounce: 200 });

		ko.addObservablesTo(this, {
			allowContactsSync: false,
			enableContactsSync: false,
			contactsSyncUrl: '',
			contactsSyncUser: '',
			contactsSyncPass: ''
		});
	}

	populate() {
		this.allowContactsSync(!!SettingsGet('ContactsSyncIsAllowed'));
		this.enableContactsSync(!!SettingsGet('EnableContactsSync'));

		this.contactsSyncUrl(SettingsGet('ContactsSyncUrl'));
		this.contactsSyncUser(SettingsGet('ContactsSyncUser'));
		this.contactsSyncPass(SettingsGet('ContactsSyncPassword'));
	}
}

export default new ContactUserStore();
