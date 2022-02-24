import { Capa } from 'Common/Enums';
import { SettingsGet, SettingsCapa } from 'Common/Globals';
import { addObservablesTo, addSubscribablesTo } from 'External/ko';

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

			capaOpenPGP: SettingsCapa(Capa.OpenPGP)
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
				Remote.saveConfig({
					CapaOpenPGP: value ? 1 : 0
				}),

			useLocalProxyForExternalImages: value =>
				Remote.saveConfig({
					UseLocalProxyForExternalImages: value ? 1 : 0
				}),

			verifySslCertificate: value => {
				value || this.allowSelfSigned(true);
				Remote.saveConfig({
					VerifySslCertificate: value ? 1 : 0
				});
			},

			allowSelfSigned: value =>
				Remote.saveConfig({
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

		Remote.request('AdminPasswordUpdate', (iError, data) => {
			if (iError) {
				this.adminPasswordUpdateError(true);
			} else {
				this.adminPassword('');
				this.adminPasswordNew('');
				this.adminPasswordNew2('');

				this.adminPasswordUpdateSuccess(true);

				this.weakPassword(!!data.Result.Weak);
			}
		}, {
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
