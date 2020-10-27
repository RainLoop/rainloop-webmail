import ko from 'ko';

import { StorageResultType } from 'Common/Enums';

import AppAdminStore from 'Stores/Admin/App';
import CapaAdminStore from 'Stores/Admin/Capa';

import Remote from 'Remote/Admin/Fetch';

import { command } from 'Knoin/Knoin';

const settingsGet = rl.settings.get;

class SecurityAdminSettings {
	constructor() {
		this.weakPassword = AppAdminStore.weakPassword;

		this.capaOpenPGP = CapaAdminStore.openPGP;

		this.capaTwoFactorAuth = CapaAdminStore.twoFactorAuth;
		this.capaTwoFactorAuthForce = CapaAdminStore.twoFactorAuthForce;

		ko.addObservablesTo(this, {
			useLocalProxyForExternalImages: !!rl.settings.get('UseLocalProxyForExternalImages'),

			verifySslCertificate: !!settingsGet('VerifySslCertificate'),
			allowSelfSigned: !!settingsGet('AllowSelfSigned'),

			isTwoFactorDropperShown: false,
			twoFactorDropperUser: '',
			twoFactorDropperUserFocused: false,

			adminLogin: settingsGet('AdminLogin'),
			adminLoginError: false,
			adminPassword: '',
			adminPasswordNew: '',
			adminPasswordNew2: '',
			adminPasswordNewError: false,

			adminPasswordUpdateError: false,
			adminPasswordUpdateSuccess: false
		});

		this.capaTwoFactorAuth.subscribe(value => {
			if (!value) {
				this.capaTwoFactorAuthForce(false);
			}
		});

		this.verifySslCertificate.subscribe(value => {
			if (!value) {
				this.allowSelfSigned(true);
			}
		});

		this.adminPassword.subscribe(() => {
			this.adminPasswordUpdateError(false);
			this.adminPasswordUpdateSuccess(false);
		});

		this.adminLogin.subscribe(() => {
			this.adminLoginError(false);
		});

		this.adminPasswordNew.subscribe(() => {
			this.adminPasswordUpdateError(false);
			this.adminPasswordUpdateSuccess(false);
			this.adminPasswordNewError(false);
		});

		this.adminPasswordNew2.subscribe(() => {
			this.adminPasswordUpdateError(false);
			this.adminPasswordUpdateSuccess(false);
			this.adminPasswordNewError(false);
		});

		this.onNewAdminPasswordResponse = this.onNewAdminPasswordResponse.bind(this);
	}

	@command((self) => self.adminLogin().trim() && self.adminPassword())
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

	onNewAdminPasswordResponse(result, data) {
		if (StorageResultType.Success === result && data && data.Result) {
			this.adminPassword('');
			this.adminPasswordNew('');
			this.adminPasswordNew2('');

			this.adminPasswordUpdateSuccess(true);

			this.weakPassword(!!data.Result.Weak);
		} else {
			this.adminPasswordUpdateError(true);
		}
	}

	onBuild() {
		this.capaOpenPGP.subscribe(value => {
			Remote.saveAdminConfig(null, {
				'CapaOpenPGP': value ? '1' : '0'
			});
		});

		this.capaTwoFactorAuth.subscribe(value => {
			Remote.saveAdminConfig(null, {
				'CapaTwoFactorAuth': value ? '1' : '0'
			});
		});

		this.capaTwoFactorAuthForce.subscribe(value => {
			Remote.saveAdminConfig(null, {
				'CapaTwoFactorAuthForce': value ? '1' : '0'
			});
		});

		this.useLocalProxyForExternalImages.subscribe(value => {
			Remote.saveAdminConfig(null, {
				'UseLocalProxyForExternalImages': value ? '1' : '0'
			});
		});

		this.verifySslCertificate.subscribe(value => {
			Remote.saveAdminConfig(null, {
				'VerifySslCertificate': value ? '1' : '0'
			});
		});

		this.allowSelfSigned.subscribe(value => {
			Remote.saveAdminConfig(null, {
				'AllowSelfSigned': value ? '1' : '0'
			});
		});
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

export { SecurityAdminSettings, SecurityAdminSettings as default };
