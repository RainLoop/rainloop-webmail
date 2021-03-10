import ko from 'ko';

import { delegateRunOnDestroy } from 'Common/UtilsUser';

import { PgpUserStore } from 'Stores/User/Pgp';
import { SettingsUserStore } from 'Stores/User/Settings';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { AddOpenPgpKeyPopupView } from 'View/Popup/AddOpenPgpKey';
import { NewOpenPgpKeyPopupView } from 'View/Popup/NewOpenPgpKey';
import { ViewOpenPgpKeyPopupView } from 'View/Popup/ViewOpenPgpKey';

export class OpenPgpUserSettings {
	constructor() {
		this.openpgpkeys = PgpUserStore.openpgpkeys;
		this.openpgpkeysPublic = PgpUserStore.openpgpkeysPublic;
		this.openpgpkeysPrivate = PgpUserStore.openpgpkeysPrivate;

		this.openPgpKeyForDeletion = ko.observable(null).deleteAccessHelper();

		this.allowDraftAutosave = SettingsUserStore.allowDraftAutosave;
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

			if (openPgpKeyToRemove && PgpUserStore.openpgpKeyring) {
				const findedItem = PgpUserStore.openpgpkeys.find(key => openPgpKeyToRemove === key);
				if (findedItem) {
					PgpUserStore.openpgpkeys.remove(findedItem);
					delegateRunOnDestroy(findedItem);

					PgpUserStore.openpgpKeyring[findedItem.isPrivate ? 'privateKeys' : 'publicKeys'].removeForId(findedItem.guid);

					PgpUserStore.openpgpKeyring.store();
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
