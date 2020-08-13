import ko from 'ko';
import * as Settings from 'Storage/Settings';

class ContactUserStore {
	constructor() {
		this.contacts = ko.observableArray([]);
		this.contacts.loading = ko.observable(false).extend({ throttle: 200 });
		this.contacts.importing = ko.observable(false).extend({ throttle: 200 });
		this.contacts.syncing = ko.observable(false).extend({ throttle: 200 });
		this.contacts.exportingVcf = ko.observable(false).extend({ throttle: 200 });
		this.contacts.exportingCsv = ko.observable(false).extend({ throttle: 200 });

		this.allowContactsSync = ko.observable(false);
		this.enableContactsSync = ko.observable(false);
		this.contactsSyncUrl = ko.observable('');
		this.contactsSyncUser = ko.observable('');
		this.contactsSyncPass = ko.observable('');
	}

	populate() {
		this.allowContactsSync(!!Settings.settingsGet('ContactsSyncIsAllowed'));
		this.enableContactsSync(!!Settings.settingsGet('EnableContactsSync'));

		this.contactsSyncUrl(Settings.settingsGet('ContactsSyncUrl'));
		this.contactsSyncUser(Settings.settingsGet('ContactsSyncUser'));
		this.contactsSyncPass(Settings.settingsGet('ContactsSyncPassword'));
	}
}

export default new ContactUserStore();
