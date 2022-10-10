import { koComputable } from 'External/ko';

import { SettingsCapa } from 'Common/Globals';
import { i18n, translateTrigger } from 'Common/Translator';

import { AbstractViewSettings } from 'Knoin/AbstractViews';

import { SettingsUserStore } from 'Stores/User/Settings';

import { GnuPGUserStore } from 'Stores/User/GnuPG';
import { OpenPGPUserStore } from 'Stores/User/OpenPGP';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { OpenPgpImportPopupView } from 'View/Popup/OpenPgpImport';
import { OpenPgpGeneratePopupView } from 'View/Popup/OpenPgpGenerate';

export class UserSettingsSecurity extends AbstractViewSettings {
	constructor() {
		super();

		this.capaAutoLogout = SettingsCapa('AutoLogout');

		this.autoLogout = SettingsUserStore.autoLogout;

		let i18nLogout = (key, params) => i18n('SETTINGS_SECURITY/AUTOLOGIN_' + key, params);
		this.autoLogoutOptions = koComputable(() => {
			translateTrigger();
			return [
				{ id: 0, name: i18nLogout('NEVER_OPTION_NAME') },
				{ id: 5, name: i18nLogout('MINUTES_OPTION_NAME', { MINUTES: 5 }) },
				{ id: 10, name: i18nLogout('MINUTES_OPTION_NAME', { MINUTES: 10 }) },
				{ id: 30, name: i18nLogout('MINUTES_OPTION_NAME', { MINUTES: 30 }) },
				{ id: 60, name: i18nLogout('MINUTES_OPTION_NAME', { MINUTES: 60 }) },
				{ id: 60 * 2, name: i18nLogout('HOURS_OPTION_NAME', { HOURS: 2 }) },
				{ id: 60 * 5, name: i18nLogout('HOURS_OPTION_NAME', { HOURS: 5 }) },
				{ id: 60 * 10, name: i18nLogout('HOURS_OPTION_NAME', { HOURS: 10 }) }
			];
		});

		if (this.capaAutoLogout) {
			this.addSetting('AutoLogout');
		}

		this.gnupgPublicKeys = GnuPGUserStore.publicKeys;
		this.gnupgPrivateKeys = GnuPGUserStore.privateKeys;

		this.openpgpkeysPublic = OpenPGPUserStore.publicKeys;
		this.openpgpkeysPrivate = OpenPGPUserStore.privateKeys;

		this.canOpenPGP = SettingsCapa('OpenPGP');
		this.canGnuPG = GnuPGUserStore.isSupported();
		this.canMailvelope = !!window.mailvelope;

		this.allowDraftAutosave = SettingsUserStore.allowDraftAutosave;

		this.allowDraftAutosave.subscribe(value => Remote.saveSetting('AllowDraftAutosave', value))
	}

	addOpenPgpKey() {
		showScreenPopup(OpenPgpImportPopupView);
	}

	generateOpenPgpKey() {
		showScreenPopup(OpenPgpGeneratePopupView);
	}

	onBuild() {
		/**
		 * Create an iframe to display the Mailvelope keyring settings.
		 * The iframe will be injected into the container identified by selector.
		 */
		window.mailvelope && mailvelope.createSettingsContainer('#mailvelope-settings'/*[, keyring], options*/);
	}
}
