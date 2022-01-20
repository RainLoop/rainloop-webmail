import ko from 'ko';

import { PgpUserStore } from 'Stores/User/Pgp';
import { SettingsUserStore } from 'Stores/User/Settings';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { AddOpenPgpKeyPopupView } from 'View/Popup/AddOpenPgpKey';
import { NewOpenPgpKeyPopupView } from 'View/Popup/NewOpenPgpKey';
import { ViewOpenPgpKeyPopupView } from 'View/Popup/ViewOpenPgpKey';

export class OpenPgpUserSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.gnupgkeys = PgpUserStore.gnupgKeys;

		this.openpgpkeysPublic = PgpUserStore.openpgpPublicKeys;
		this.openpgpkeysPrivate = PgpUserStore.openpgpPrivateKeys;
		this.openPgpKeyForDeletion = ko.observable(null).deleteAccessHelper();

		this.canOpenPGP = !!PgpUserStore.openpgpKeyring;
//		this.canOpenPGP = Settings.capa(Capa.OpenPGP);

		this.allowDraftAutosave = SettingsUserStore.allowDraftAutosave;

		this.allowDraftAutosave.subscribe(value => Remote.saveSetting('AllowDraftAutosave', value ? 1 : 0))
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
			PgpUserStore.deleteKey(openPgpKeyToRemove);
		}
	}
}
