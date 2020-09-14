import ko from 'ko';

import { StorageResultType } from 'Common/Enums';

import AppAdminStore from 'Stores/Admin/App';
import CapaAdminStore from 'Stores/Admin/Capa';

import Remote from 'Remote/Admin/Fetch';

import { command } from 'Knoin/Knoin';

const settingsGet = rl.settings.get;

class SecurityAdminSettings {
	constructor() {
		this.useLocalProxyForExternalImages = AppAdminStore.useLocalProxyForExternalImages;

		this.weakPassword = AppAdminStore.weakPassword;

		this.capaOpenPGP = CapaAdminStore.openPGP;

		this.capaTwoFactorAuth = CapaAdminStore.twoFactorAuth;
		this.capaTwoFactorAuthForce = CapaAdminStore.twoFactorAuthForce;

		this.capaTwoFactorAuth.subscribe((value) => {
			if (!value) {
				this.capaTwoFactorAuthForce(false);
			}
		});

		this.verifySslCertificate = ko.observable(!!settingsGet('VerifySslCertificate'));
		this.allowSelfSigned = ko.observable(!!settingsGet('AllowSelfSigned'));

		this.verifySslCertificate.subscribe((value) => {
			if (!value) {
				this.allowSelfSigned(true);
			}
		});

		this.isTwoFactorDropperShown = ko.observable(false);
		this.twoFactorDropperUser = ko.observable('');
		this.twoFactorDropperUser.focused = ko.observable(false);

		this.adminLogin = ko.observable(settingsGet('AdminLogin'));
		this.adminLoginError = ko.observable(false);
		this.adminPassword = ko.observable('');
		this.adminPasswordNew = ko.observable('');
		this.adminPasswordNew2 = ko.observable('');
		this.adminPasswordNewError = ko.observable(false);

		this.adminPasswordUpdateError = ko.observable(false);
		this.adminPasswordUpdateSuccess = ko.observable(false);

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
			this.twoFactorDropperUser.focused(true);
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
		this.capaOpenPGP.subscribe((value) => {
			Remote.saveAdminConfig(null, {
				'CapaOpenPGP': value ? '1' : '0'
			});
		});

		this.capaTwoFactorAuth.subscribe((value) => {
			Remote.saveAdminConfig(null, {
				'CapaTwoFactorAuth': value ? '1' : '0'
			});
		});

		this.capaTwoFactorAuthForce.subscribe((value) => {
			Remote.saveAdminConfig(null, {
				'CapaTwoFactorAuthForce': value ? '1' : '0'
			});
		});

		this.useLocalProxyForExternalImages.subscribe((value) => {
			Remote.saveAdminConfig(null, {
				'UseLocalProxyForExternalImages': value ? '1' : '0'
			});
		});

		this.verifySslCertificate.subscribe((value) => {
			Remote.saveAdminConfig(null, {
				'VerifySslCertificate': value ? '1' : '0'
			});
		});

		this.allowSelfSigned.subscribe((value) => {
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
		this.twoFactorDropperUser.focused(false);
	}
}

export { SecurityAdminSettings, SecurityAdminSettings as default };
