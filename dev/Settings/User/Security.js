import { koComputable } from 'External/ko';

import { SettingsCapa } from 'Common/Globals';
import { i18n, translateTrigger, relativeTime } from 'Common/Translator';

import { AbstractViewSettings } from 'Knoin/AbstractViews';

import { SettingsUserStore } from 'Stores/User/Settings';

import { GnuPGUserStore } from 'Stores/User/GnuPG';
import { OpenPGPUserStore } from 'Stores/User/OpenPGP';

import { showScreenPopup } from 'Knoin/Knoin';

import { OpenPgpImportPopupView } from 'View/Popup/OpenPgpImport';
import { OpenPgpGeneratePopupView } from 'View/Popup/OpenPgpGenerate';

import { SMimeUserStore } from 'Stores/User/SMime';

import Remote from 'Remote/User/Fetch';

export class UserSettingsSecurity extends AbstractViewSettings {
	constructor() {
		super();

		this.autoLogout = SettingsUserStore.autoLogout;
		this.autoLogoutOptions = koComputable(() => {
			translateTrigger();
			return [
				{ id: 0, name: i18n('SETTINGS_SECURITY/AUTOLOGIN_NEVER_OPTION_NAME') },
				{ id: 5, name: relativeTime(300) },
				{ id: 10, name: relativeTime(600) },
				{ id: 30, name: relativeTime(1800) },
				{ id: 60, name: relativeTime(3600) },
				{ id: 120, name: relativeTime(7200) },
				{ id: 300, name: relativeTime(18000) },
				{ id: 600, name: relativeTime(36000) }
			];
		});
		this.addSetting('AutoLogout');

		this.gnupgPublicKeys = GnuPGUserStore.publicKeys;
		this.gnupgPrivateKeys = GnuPGUserStore.privateKeys;

		this.openpgpkeysPublic = OpenPGPUserStore.publicKeys;
		this.openpgpkeysPrivate = OpenPGPUserStore.privateKeys;

		this.smimeCertificates = SMimeUserStore;

		this.canOpenPGP = SettingsCapa('OpenPGP');
		this.canGnuPG = GnuPGUserStore.isSupported();
		this.canMailvelope = !!window.mailvelope;
	}

	addOpenPgpKey() {
		showScreenPopup(OpenPgpImportPopupView);
	}

	generateOpenPgpKey() {
		showScreenPopup(OpenPgpGeneratePopupView);
	}

	importToOpenPGP() {
		OpenPGPUserStore.isSupported() && Remote.request('GetPGPKeys',
			(iError, oData) => {
				if (!iError && oData.Result) {
					oData.Result.forEach(key => OpenPGPUserStore.importKey(key));
				}
			}
		);
	}

	onBuild() {
		/**
		 * Create an iframe to display the Mailvelope keyring settings.
		 * The iframe will be injected into the container identified by selector.
		 */
		window.mailvelope && mailvelope.createSettingsContainer('#mailvelope-settings'/*[, keyring], options*/);
		/**
		 * https://github.com/the-djmaze/snappymail/issues/973
		Remote.request('GetStoredPGPKeys', (iError, data) => {
			console.dir([iError, data]);
		});
		*/
	}
}
