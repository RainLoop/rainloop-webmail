import ko from 'ko';

class ContactUserStore {
	constructor() {
		this.contacts = ko.observableArray();
		this.contacts.loading = ko.observable(false).extend({ throttle: 200 });
		this.contacts.importing = ko.observable(false).extend({ throttle: 200 });
		this.contacts.syncing = ko.observable(false).extend({ throttle: 200 });
		this.contacts.exportingVcf = ko.observable(false).extend({ throttle: 200 });
		this.contacts.exportingCsv = ko.observable(false).extend({ throttle: 200 });

		ko.addObservablesTo(this, {
			allowContactsSync: false,
			enableContactsSync: false,
			contactsSyncUrl: '',
			contactsSyncUser: '',
			contactsSyncPass: ''
		});
	}

	populate() {
		const settingsGet = rl.settings.get;
		this.allowContactsSync(!!settingsGet('ContactsSyncIsAllowed'));
		this.enableContactsSync(!!settingsGet('EnableContactsSync'));

		this.contactsSyncUrl(settingsGet('ContactsSyncUrl'));
		this.contactsSyncUser(settingsGet('ContactsSyncUser'));
		this.contactsSyncPass(settingsGet('ContactsSyncPassword'));
	}
}

export default new ContactUserStore();
