import ko from 'ko';
import { SettingsGet } from 'Common/Globals';
import { pInt, addObservablesTo } from 'Common/Utils';
import Remote from 'Remote/User/Fetch';

export const ContactUserStore = ko.observableArray();

ContactUserStore.loading = ko.observable(false).extend({ debounce: 200 });
ContactUserStore.importing = ko.observable(false).extend({ debounce: 200 });
ContactUserStore.syncing = ko.observable(false).extend({ debounce: 200 });

addObservablesTo(ContactUserStore, {
	allowSync: false, // Admin setting
	enableSync: false,
	syncUrl: '',
	syncUser: '',
	syncPass: ''
});

/**
 * @param {Function} fResultFunc
 * @returns {void}
 */
ContactUserStore.sync = fResultFunc => {
	if (ContactUserStore.enableSync()
	 && !ContactUserStore.importing()
	 && !ContactUserStore.syncing()
	) {
		ContactUserStore.syncing(true);
		Remote.contactsSync((sResult, oData) => {
			ContactUserStore.syncing(false);
			fResultFunc && fResultFunc(sResult, oData);
		});
	}
};

ContactUserStore.init = () => {
	let value = !!SettingsGet('ContactsSyncIsAllowed');
	ContactUserStore.allowSync(value);
	if (value) {
		ContactUserStore.enableSync(!!SettingsGet('EnableContactsSync'));
		ContactUserStore.syncUrl(SettingsGet('ContactsSyncUrl'));
		ContactUserStore.syncUser(SettingsGet('ContactsSyncUser'));
		ContactUserStore.syncPass(SettingsGet('ContactsSyncPassword'));
		setTimeout(ContactUserStore.sync, 10000);
		value = pInt(SettingsGet('ContactsSyncInterval'));
		value = 5 <= value ? value : 20;
		value = 320 >= value ? value : 320;
		setInterval(ContactUserStore.sync, value * 60000 + 5000);
	}
};
