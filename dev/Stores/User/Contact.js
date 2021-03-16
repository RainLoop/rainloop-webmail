import ko from 'ko';
import { SettingsGet } from 'Common/Globals';
import { addObservablesTo } from 'Common/Utils';

export const ContactUserStore = ko.observableArray();

ContactUserStore.loading = ko.observable(false).extend({ debounce: 200 });
ContactUserStore.importing = ko.observable(false).extend({ debounce: 200 });
ContactUserStore.syncing = ko.observable(false).extend({ debounce: 200 });

addObservablesTo(ContactUserStore, {
	allowSync: false,
	enableSync: false,
	syncUrl: '',
	syncUser: '',
	syncPass: ''
});

ContactUserStore.populate = function() {
	this.allowSync(!!SettingsGet('ContactsSyncIsAllowed'));
	this.enableSync(!!SettingsGet('EnableContactsSync'));

	this.syncUrl(SettingsGet('ContactsSyncUrl'));
	this.syncUser(SettingsGet('ContactsSyncUser'));
	this.syncPass(SettingsGet('ContactsSyncPassword'));
};
