import ko from 'ko';

import { delegateRunOnDestroy } from 'Common/UtilsUser';

import PgpStore from 'Stores/User/Pgp';
import SettingsStore from 'Stores/User/Settings';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { AddOpenPgpKeyPopupView } from 'View/Popup/AddOpenPgpKey';
import { NewOpenPgpKeyPopupView } from 'View/Popup/NewOpenPgpKey';
import { ViewOpenPgpKeyPopupView } from 'View/Popup/ViewOpenPgpKey';

export class OpenPgpUserSettings {
	constructor() {
		this.openpgpkeys = PgpStore.openpgpkeys;
		this.openpgpkeysPublic = PgpStore.openpgpkeysPublic;
		this.openpgpkeysPrivate = PgpStore.openpgpkeysPrivate;

		this.openPgpKeyForDeletion = ko.observable(null).deleteAccessHelper();

		this.allowDraftAutosave = SettingsStore.allowDraftAutosave;
	}

	addOpenPgpKey() {
		showScreenPopup(AddOpenPgpKeyPopupView);
	}

	generateOpenPgpKey() {
		showScreenPopup(NewOpenPgpKeyPopupView);
	}

	viewOpenPgpKey(openPgpKey) {
		if (openPgpKey) {
			showScreenPopup(ViewOpenPgpKeyPopupView, [openPgpKey]);
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
				const findedItem = PgpStore.openpgpkeys.find(key => openPgpKeyToRemove === key);
				if (findedItem) {
					PgpStore.openpgpkeys.remove(findedItem);
					delegateRunOnDestroy(findedItem);

					PgpStore.openpgpKeyring[findedItem.isPrivate ? 'privateKeys' : 'publicKeys'].removeForId(findedItem.guid);

					PgpStore.openpgpKeyring.store();
				}

				rl.app.reloadOpenPgpKeys();
			}
		}
	}

	onBuild() {
		setTimeout(() => {
			this.allowDraftAutosave.subscribe(Remote.saveSettingsHelper('AllowDraftAutosave', v=>v?'1':'0'));
		}, 50);
	}
}
