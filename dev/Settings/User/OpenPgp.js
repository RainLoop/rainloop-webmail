import ko from 'ko';

import { PgpUserStore } from 'Stores/User/Pgp';
import { SettingsUserStore } from 'Stores/User/Settings';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { OpenPgpImportPopupView } from 'View/Popup/OpenPgpImport';
import { OpenPgpGeneratePopupView } from 'View/Popup/OpenPgpGenerate';
import { ViewOpenPgpKeyPopupView } from 'View/Popup/ViewOpenPgpKey';

import { Capa } from 'Common/Enums';
import { Settings } from 'Common/Globals';

export class OpenPgpUserSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.gnupgkeys = PgpUserStore.gnupgKeys;

		this.openpgpkeysPublic = PgpUserStore.openpgpPublicKeys;
		this.openpgpkeysPrivate = PgpUserStore.openpgpPrivateKeys;
		this.openPgpKeyForDeletion = ko.observable(null).deleteAccessHelper();

		this.canOpenPGP = Settings.capa(Capa.OpenPGP);
		this.canGnuPG = Settings.capa(Capa.GnuPG);
		this.canMailvelope = !!window.mailvelope;

		this.allowDraftAutosave = SettingsUserStore.allowDraftAutosave;

		this.allowDraftAutosave.subscribe(value => Remote.saveSetting('AllowDraftAutosave', value ? 1 : 0))
	}

	addOpenPgpKey() {
		showScreenPopup(OpenPgpImportPopupView);
	}

	generateOpenPgpKey() {
		showScreenPopup(OpenPgpGeneratePopupView);
	}

	viewOpenPgpKey(openPgpKey) {
		if (openPgpKey) {
			showScreenPopup(ViewOpenPgpKeyPopupView, [openPgpKey]);
		}
	}

	onBuild() {
		/**
		 * Create an iframe to display the Mailvelope keyring settings.
		 * The iframe will be injected into the container identified by selector.
		 */
		window.mailvelope && mailvelope.createSettingsContainer('#mailvelope-settings'/*[, keyring], options*/);
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
