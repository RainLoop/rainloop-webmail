import { Capa } from 'Common/Enums';
import { Settings, SettingsGet } from 'Common/Globals';
import { addObservablesTo, addSubscribablesTo } from 'Common/Utils';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';

export class SecurityAdminSettings {
	constructor() {
		this.weakPassword = rl.app.weakPassword;

		addObservablesTo(this, {
			useLocalProxyForExternalImages: !!SettingsGet('UseLocalProxyForExternalImages'),

			verifySslCertificate: !!SettingsGet('VerifySslCertificate'),
			allowSelfSigned: !!SettingsGet('AllowSelfSigned'),

			isTwoFactorDropperShown: false,
			twoFactorDropperUser: '',
			twoFactorDropperUserFocused: false,

			adminLogin: SettingsGet('AdminLogin'),
			adminLoginError: false,
			adminPassword: '',
			adminPasswordNew: '',
			adminPasswordNew2: '',
			adminPasswordNewError: false,

			adminPasswordUpdateError: false,
			adminPasswordUpdateSuccess: false,

			capaOpenPGP: Settings.capa(Capa.OpenPGP),
			capaTwoFactorAuth: Settings.capa(Capa.TwoFactor),
			capaTwoFactorAuthForce: Settings.capa(Capa.TwoFactorForce)
		});

		addSubscribablesTo(this, {
			adminPassword: () => {
				this.adminPasswordUpdateError(false);
				this.adminPasswordUpdateSuccess(false);
			},

			adminLogin: () => this.adminLoginError(false),

			adminPasswordNew: () => {
				this.adminPasswordUpdateError(false);
				this.adminPasswordUpdateSuccess(false);
				this.adminPasswordNewError(false);
			},

			adminPasswordNew2: () => {
				this.adminPasswordUpdateError(false);
				this.adminPasswordUpdateSuccess(false);
				this.adminPasswordNewError(false);
			},

			capaOpenPGP: value =>
				Remote.saveAdminConfig(null, {
					'CapaOpenPGP': value ? 1 : 0
				}),

			capaTwoFactorAuth: value => {
				value || this.capaTwoFactorAuthForce(false);
				Remote.saveAdminConfig(null, {
					'CapaTwoFactorAuth': value ? 1 : 0
				});
			},

			capaTwoFactorAuthForce: value =>
				Remote.saveAdminConfig(null, {
					'CapaTwoFactorAuthForce': value ? 1 : 0
				}),

			useLocalProxyForExternalImages: value =>
				Remote.saveAdminConfig(null, {
					'UseLocalProxyForExternalImages': value ? 1 : 0
				}),

			verifySslCertificate: value => {
				value => value || this.allowSelfSigned(true);
				Remote.saveAdminConfig(null, {
					'VerifySslCertificate': value ? 1 : 0
				});
			},

			allowSelfSigned: value =>
				Remote.saveAdminConfig(null, {
					'AllowSelfSigned': value ? 1 : 0
				})
		});

		this.onNewAdminPasswordResponse = this.onNewAdminPasswordResponse.bind(this);

		decorateKoCommands(this, {
			saveNewAdminPasswordCommand: self => self.adminLogin().trim() && self.adminPassword()
		});
	}

	saveNewAdminPasswordCommand() {
		if (!this.adminLogin().trim()) {
			this.adminLoginError(true);
			return false;
		}

		if (this.adminPasswordNew() !== this.adminPasswordNew2()) {
			this.adminPasswordNewError(true);
			return false;
		}

		this.adminPasswordUpdateError(false);
		this.adminPasswordUpdateSuccess(false);

		Remote.saveNewAdminPassword(this.onNewAdminPasswordResponse, {
			'Login': this.adminLogin(),
			'Password': this.adminPassword(),
			'NewPassword': this.adminPasswordNew()
		});

		return true;
	}

	showTwoFactorDropper() {
		this.twoFactorDropperUser('');
		this.isTwoFactorDropperShown(true);

		setTimeout(() => {
			this.twoFactorDropperUserFocused(true);
		}, 50);
	}

	onNewAdminPasswordResponse(iError, data) {
		if (!iError && data && data.Result) {
			this.adminPassword('');
			this.adminPasswordNew('');
			this.adminPasswordNew2('');

			this.adminPasswordUpdateSuccess(true);

			this.weakPassword(!!data.Result.Weak);
		} else {
			this.adminPasswordUpdateError(true);
		}
	}

	onHide() {
		this.adminPassword('');
		this.adminPasswordNew('');
		this.adminPasswordNew2('');

		this.isTwoFactorDropperShown(false);
		this.twoFactorDropperUser('');
		this.twoFactorDropperUserFocused(false);
	}
}
