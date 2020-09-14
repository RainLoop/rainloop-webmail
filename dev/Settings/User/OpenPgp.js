import ko from 'ko';

import { delegateRunOnDestroy } from 'Common/Utils';

import PgpStore from 'Stores/User/Pgp';
import SettingsStore from 'Stores/User/Settings';

import Remote from 'Remote/User/Fetch';

import { getApp } from 'Helper/Apps/User';

import { showScreenPopup } from 'Knoin/Knoin';

class OpenPgpUserSettings {
	constructor() {
		this.openpgpkeys = PgpStore.openpgpkeys;
		this.openpgpkeysPublic = PgpStore.openpgpkeysPublic;
		this.openpgpkeysPrivate = PgpStore.openpgpkeysPrivate;

		this.openPgpKeyForDeletion = ko.observable(null).deleteAccessHelper();

		this.allowDraftAutosave = SettingsStore.allowDraftAutosave;
	}

	addOpenPgpKey() {
		showScreenPopup(require('View/Popup/AddOpenPgpKey'));
	}

	generateOpenPgpKey() {
		showScreenPopup(require('View/Popup/NewOpenPgpKey'));
	}

	viewOpenPgpKey(openPgpKey) {
		if (openPgpKey) {
			showScreenPopup(require('View/Popup/ViewOpenPgpKey'), [openPgpKey]);
		}
	}

	/**
	 * @param {OpenPgpKeyModel} openPgpKeyToRemove
	 * @returns {void}
	 */
	deleteOpenPgpKey(openPgpKeyToRemove) {
		if (openPgpKeyToRemove && openPgpKeyToRemove.deleteAccess()) {
			this.openPgpKeyForDeletion(null);

			if (openPgpKeyToRemove && PgpStore.openpgpKeyring) {
				const findedItem = PgpStore.openpgpkeys().find(key => openPgpKeyToRemove === key);
				if (findedItem) {
					PgpStore.openpgpkeys.remove(findedItem);
					delegateRunOnDestroy(findedItem);

					PgpStore.openpgpKeyring[findedItem.isPrivate ? 'privateKeys' : 'publicKeys'].removeForId(findedItem.guid);

					PgpStore.openpgpKeyring.store();
				}

				getApp().reloadOpenPgpKeys();
			}
		}
	}

	onBuild() {
		setTimeout(() => {
			this.allowDraftAutosave.subscribe(Remote.saveSettingsHelper('AllowDraftAutosave', v=>v?'1':'0'));
		}, 50);
	}
}

export { OpenPgpUserSettings, OpenPgpUserSettings as default };
