import { Capa } from 'Common/Enums';
import { Settings, SettingsGet } from 'Common/Globals';
import { addObservablesTo, addSubscribablesTo } from 'Common/Utils';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';

export class SecurityAdminSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.weakPassword = rl.app.weakPassword;

		addObservablesTo(this, {
			useLocalProxyForExternalImages: !!SettingsGet('UseLocalProxyForExternalImages'),

			verifySslCertificate: !!SettingsGet('VerifySslCertificate'),
			allowSelfSigned: !!SettingsGet('AllowSelfSigned'),

			adminLogin: SettingsGet('AdminLogin'),
			adminLoginError: false,
			adminPassword: '',
			adminPasswordNew: '',
			adminPasswordNew2: '',
			adminPasswordNewError: false,
			adminTOTP: SettingsGet('AdminTOTP'),

			adminPasswordUpdateError: false,
			adminPasswordUpdateSuccess: false,

			capaOpenPGP: Settings.capa(Capa.OpenPGP)
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
					CapaOpenPGP: value ? 1 : 0
				}),

			useLocalProxyForExternalImages: value =>
				Remote.saveAdminConfig(null, {
					UseLocalProxyForExternalImages: value ? 1 : 0
				}),

			verifySslCertificate: value => {
				value => value || this.allowSelfSigned(true);
				Remote.saveAdminConfig(null, {
					VerifySslCertificate: value ? 1 : 0
				});
			},

			allowSelfSigned: value =>
				Remote.saveAdminConfig(null, {
					AllowSelfSigned: value ? 1 : 0
				})
		});

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

		Remote.defaultRequest((iError, data) => {
			if (iError) {
				this.adminPasswordUpdateError(true);
			} else {
				this.adminPassword('');
				this.adminPasswordNew('');
				this.adminPasswordNew2('');

				this.adminPasswordUpdateSuccess(true);

				this.weakPassword(!!data.Result.Weak);
			}
		}, 'AdminPasswordUpdate', {
			'Login': this.adminLogin(),
			'Password': this.adminPassword(),
			'NewPassword': this.adminPasswordNew(),
			'TOTP': this.adminTOTP()
		});

		return true;
	}

	onHide() {
		this.adminPassword('');
		this.adminPasswordNew('');
		this.adminPasswordNew2('');
	}
}
