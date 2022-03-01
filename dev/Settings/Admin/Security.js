import { Capa } from 'Common/Enums';
import { SettingsGet, SettingsCapa } from 'Common/Globals';
import { addObservablesTo, addSubscribablesTo } from 'External/ko';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewSettings } from 'Knoin/AbstractViews';

export class SecurityAdminSettings extends AbstractViewSettings {
	constructor() {
		super();

		this.addSettings(['UseLocalProxyForExternalImages','VerifySslCertificate','AllowSelfSigned']);

		this.weakPassword = rl.app.weakPassword;

		addObservablesTo(this, {
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

		const reset = () => {
			this.adminPasswordUpdateError(false);
			this.adminPasswordUpdateSuccess(false);
			this.adminPasswordNewError(false);
		};

		addSubscribablesTo(this, {
			adminPassword: () => {
				this.adminPasswordUpdateError(false);
				this.adminPasswordUpdateSuccess(false);
			},

			adminLogin: () => this.adminLoginError(false),

			adminPasswordNew: reset,

			adminPasswordNew2: reset,

			capaOpenPGP: value => Remote.saveSetting('CapaOpenPGP', value)
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
