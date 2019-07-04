import _ from '_';
import ko from 'ko';

import { trim, boolToAjax } from 'Common/Utils';
import { phpInfo } from 'Common/Links';
import { StorageResultType, Magics } from 'Common/Enums';

import { settingsGet } from 'Storage/Settings';

import AppAdminStore from 'Stores/Admin/App';
import CapaAdminStore from 'Stores/Admin/Capa';

import Remote from 'Remote/Admin/Ajax';

import { command } from 'Knoin/Knoin';

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

		this.onNewAdminPasswordResponse = _.bind(this.onNewAdminPasswordResponse, this);
	}

	@command((self) => '' !== trim(self.adminLogin()) && '' !== self.adminPassword())
	saveNewAdminPasswordCommand() {
		if ('' === trim(this.adminLogin())) {
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

		_.delay(() => {
			this.twoFactorDropperUser.focused(true);
		}, Magics.Time50ms);
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
				'CapaOpenPGP': boolToAjax(value)
			});
		});

		this.capaTwoFactorAuth.subscribe((value) => {
			Remote.saveAdminConfig(null, {
				'CapaTwoFactorAuth': boolToAjax(value)
			});
		});

		this.capaTwoFactorAuthForce.subscribe((value) => {
			Remote.saveAdminConfig(null, {
				'CapaTwoFactorAuthForce': boolToAjax(value)
			});
		});

		this.useLocalProxyForExternalImages.subscribe((value) => {
			Remote.saveAdminConfig(null, {
				'UseLocalProxyForExternalImages': boolToAjax(value)
			});
		});

		this.verifySslCertificate.subscribe((value) => {
			Remote.saveAdminConfig(null, {
				'VerifySslCertificate': boolToAjax(value)
			});
		});

		this.allowSelfSigned.subscribe((value) => {
			Remote.saveAdminConfig(null, {
				'AllowSelfSigned': boolToAjax(value)
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

	/**
	 * @returns {string}
	 */
	phpInfoLink() {
		return phpInfo();
	}
}

export { SecurityAdminSettings, SecurityAdminSettings as default };
