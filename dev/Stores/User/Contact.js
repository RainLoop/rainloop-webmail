import ko from 'ko';
import { SettingsGet } from 'Common/Globals';
import { pInt } from 'Common/Utils';
import { addObservablesTo, koArrayWithDestroy } from 'External/ko';
import Remote from 'Remote/User/Fetch';

export const ContactUserStore = koArrayWithDestroy();

ContactUserStore.loading = ko.observable(false).extend({ debounce: 200 });
ContactUserStore.importing = ko.observable(false).extend({ debounce: 200 });
ContactUserStore.syncing = ko.observable(false).extend({ debounce: 200 });

addObservablesTo(ContactUserStore, {
	allowSync: false, // Admin setting
	syncMode: 0,
	syncUrl: '',
	syncUser: '',
	syncPass: ''
});

/**
 * @param {Function} fResultFunc
 * @returns {void}
 */
ContactUserStore.sync = fResultFunc => {
	if (ContactUserStore.syncMode()
	 && !ContactUserStore.importing()
	 && !ContactUserStore.syncing()
	) {
		ContactUserStore.syncing(true);
		Remote.streamPerLine(line => {
			try {
				line = JSON.parse(line);
				if ('ContactsSync' === line.Action) {
					ContactUserStore.syncing(false);
					fResultFunc?.(line.ErrorCode, line);
				}
			} catch (e) {
				ContactUserStore.syncing(false);
				console.error(e);
				fResultFunc?.(Notification.UnknownError);
			}
		}, 'ContactsSync');
	}
};

ContactUserStore.init = () => {
	let value = !!SettingsGet('ContactsSyncIsAllowed');
	ContactUserStore.allowSync(value);
	if (value) {
		ContactUserStore.syncMode(SettingsGet('ContactsSyncMode'));
		ContactUserStore.syncUrl(SettingsGet('ContactsSyncUrl'));
		ContactUserStore.syncUser(SettingsGet('ContactsSyncUser'));
		ContactUserStore.syncPass(SettingsGet('ContactsSyncPassword'));
		setTimeout(ContactUserStore.sync, 10000);
		value = pInt(SettingsGet('ContactsSyncInterval'));
		value = 5 <= value ? (320 >= value ? value : 320) : 20;
		setInterval(ContactUserStore.sync, value * 60000 + 5000);
	}
};
