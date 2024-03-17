import { SettingsGet, SettingsCapa } from 'Common/Globals';
import { addObservablesTo, addSubscribablesTo } from 'External/ko';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewSettings } from 'Knoin/AbstractViews';

export class AdminSettingsSecurity extends AbstractViewSettings {
	constructor() {
		super();

		this.addSettings(['useLocalProxyForExternalImages', 'autoVerifySignatures']);

		this.weakPassword = rl.app.weakPassword;

		addObservablesTo(this, {
			adminLogin: SettingsGet('adminLogin'),
			adminLoginError: false,
			adminPassword: '',
			adminPasswordNew: '',
			adminPasswordNew2: '',
			adminPasswordNewError: false,
			adminTOTP: '',

			saveError: false,
			saveSuccess: false,

			viewQRCode: '',

			capaGnuPG: SettingsCapa('GnuPG'),
			capaOpenPGP: SettingsCapa('OpenPGP')
		});

		const reset = () => {
			this.saveError(false);
			this.saveSuccess(false);
			this.adminPasswordNewError(false);
		};

		addSubscribablesTo(this, {
			adminPassword: () => {
				this.saveError(false);
				this.saveSuccess(false);
			},

			adminLogin: () => this.adminLoginError(false),

			adminTOTP: value => {
				if (/[A-Z2-7]{16,}/.test(value) && 0 == value.length * 5 % 8) {
					Remote.request('AdminQRCode', (iError, data) => {
						if (!iError) {
							console.dir({data:data});
							this.viewQRCode(data.Result);
						}
					}, {
						'username': this.adminLogin(),
						'TOTP': this.adminTOTP()
					});
				} else {
					this.viewQRCode('');
				}
			},

			adminPasswordNew: reset,

			adminPasswordNew2: reset,

			capaGnuPG: value => Remote.saveSetting('capaGnuPG', value),
			capaOpenPGP: value => Remote.saveSetting('capaOpenPGP', value)
		});

		this.adminTOTP(SettingsGet('adminTOTP'));

		decorateKoCommands(this, {
			saveAdminUserCommand: self => self.adminLogin().trim() && self.adminPassword()
		});
	}

	generateTOTP() {
		let CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
			length = 16,
			secret = '';
		while (0 < length--) {
			secret += CHARS[Math.floor(Math.random() * 32)];
		}
		this.adminTOTP(secret);
	}

	saveAdminUserCommand() {
		if (!this.adminLogin().trim()) {
			this.adminLoginError(true);
			return false;
		}

		if (this.adminPasswordNew() !== this.adminPasswordNew2()) {
			this.adminPasswordNewError(true);
			return false;
		}

		this.saveError(false);
		this.saveSuccess(false);

		Remote.request('AdminPasswordUpdate', (iError, data) => {
			if (iError) {
				this.saveError(true);
			} else {
				this.adminPassword('');
				this.adminPasswordNew('');
				this.adminPasswordNew2('');

				this.saveSuccess(true);

				this.weakPassword(!!data.Result.Weak);
			}
		}, {
			Login: this.adminLogin(),
			Password: this.adminPassword(),
			newPassword: this.adminPasswordNew(),
			TOTP: this.adminTOTP()
		});

		return true;
	}

	onHide() {
		this.adminPassword('');
		this.adminPasswordNew('');
		this.adminPasswordNew2('');
	}
}
