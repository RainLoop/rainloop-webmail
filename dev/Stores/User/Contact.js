import ko from 'ko';
import { SettingsGet } from 'Common/Globals';
import { koComputable, addObservablesTo, koArrayWithDestroy } from 'External/ko';
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

// Also used by Selector
ContactUserStore.hasChecked = koComputable(
	// Issue: not all are observed?
	() => !!ContactUserStore.find(item => item.checked())
);

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
	let config = SettingsGet('ContactsSync');
	ContactUserStore.allowSync(!!config);
	if (config) {
		ContactUserStore.syncMode(config.Mode);
		ContactUserStore.syncUrl(config.Url);
		ContactUserStore.syncUser(config.User);
		ContactUserStore.syncPass(config.Password);
		setTimeout(ContactUserStore.sync, 10000);
		setInterval(ContactUserStore.sync, config.Interval * 60000 + 5000);
	}
};
