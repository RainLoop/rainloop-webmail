import { Capa, StorageResultType } from 'Common/Enums';
import { pString } from 'Common/Utils';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

class TwoFactorConfigurationPopupView extends AbstractViewPopup {
	constructor() {
		super('TwoFactorConfiguration');

		this.addObservables({
			lock: false,

			processing: false,
			clearing: false,
			secreting: false,

			viewUser: '',
			twoFactorStatus: false,

			twoFactorTested: false,

			viewSecret: '',
			viewBackupCodes: '',
			viewUrlTitle: '',
			viewUrl: '',

			viewEnable_: false
		});

		this.capaTwoFactor = rl.settings.capa(Capa.TwoFactor);

		this.addComputables({
			viewEnable: {
				read: this.viewEnable_,
				write: (value) => {
					value = !!value;
					if (value && this.twoFactorTested()) {
						this.viewEnable_(value);
						Remote.enableTwoFactor((result, data) => {
							if (StorageResultType.Success !== result || !data || !data.Result) {
								this.viewEnable_(false);
							}
						}, true);
					} else {
						if (!value) {
							this.viewEnable_(value);
						}

						Remote.enableTwoFactor((result, data) => {
							if (StorageResultType.Success !== result || !data || !data.Result) {
								this.viewEnable_(false);
							}
						}, false);
					}
				}
			},

			viewTwoFactorEnableTooltip: () => {
				translatorTrigger();
				return this.twoFactorTested() || this.viewEnable_()
					? ''
					: i18n('POPUPS_TWO_FACTOR_CFG/TWO_FACTOR_SECRET_TEST_BEFORE_DESC');
			},

			viewTwoFactorStatus: () => {
				translatorTrigger();
				return i18n(
					this.twoFactorStatus()
						? 'POPUPS_TWO_FACTOR_CFG/TWO_FACTOR_SECRET_CONFIGURED_DESC'
						: 'POPUPS_TWO_FACTOR_CFG/TWO_FACTOR_SECRET_NOT_CONFIGURED_DESC'
				);
			},

			twoFactorAllowedEnable: () => this.viewEnable() || this.twoFactorTested()
		});

		this.onResult = this.onResult.bind(this);
		this.onShowSecretResult = this.onShowSecretResult.bind(this);
	}

	showSecret() {
		this.secreting(true);
		Remote.showTwoFactorSecret(this.onShowSecretResult);
	}

	hideSecret() {
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrlTitle('');
		this.viewUrl('');
	}

	createTwoFactor() {
		this.processing(true);
		Remote.createTwoFactor(this.onResult);
	}

	logout() {
		rl.app.logout();
	}

	testTwoFactor() {
		showScreenPopup(require('View/Popup/TwoFactorTest'), [this.twoFactorTested]);
	}

	clearTwoFactor() {
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrlTitle('');
		this.viewUrl('');

		this.twoFactorTested(false);

		this.clearing(true);
		Remote.clearTwoFactor(this.onResult);
	}

	onShow(bLock) {
		this.lock(!!bLock);

		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrlTitle('');
		this.viewUrl('');
	}

	onHide() {
		if (this.lock()) {
			location.reload();
		}
	}

	getQr() {
		return (
			'otpauth://totp/' +
			encodeURIComponent(this.viewUser()) +
			'?secret=' +
			encodeURIComponent(this.viewSecret()) +
			'&issuer=' +
			encodeURIComponent('')
		);
	}

	onResult(sResult, oData) {
		this.processing(false);
		this.clearing(false);

		if (StorageResultType.Success === sResult && oData && oData.Result) {
			this.viewUser(pString(oData.Result.User));
			this.viewEnable_(!!oData.Result.Enable);
			this.twoFactorStatus(!!oData.Result.IsSet);
			this.twoFactorTested(!!oData.Result.Tested);

			this.viewSecret(pString(oData.Result.Secret));
			this.viewBackupCodes(pString(oData.Result.BackupCodes).replace(/[\s]+/g, '  '));

			this.viewUrlTitle(pString(oData.Result.UrlTitle));
			this.viewUrl(qr.toDataURL({ level: 'M', size: 8, value: this.getQr() }));
		} else {
			this.viewUser('');
			this.viewEnable_(false);
			this.twoFactorStatus(false);
			this.twoFactorTested(false);

			this.viewSecret('');
			this.viewBackupCodes('');
			this.viewUrlTitle('');
			this.viewUrl('');
		}
	}

	onShowSecretResult(result, data) {
		this.secreting(false);

		if (StorageResultType.Success === result && data && data.Result) {
			this.viewSecret(pString(data.Result.Secret));
			this.viewUrlTitle(pString(data.Result.UrlTitle));
			this.viewUrl(qr.toDataURL({ level: 'M', size: 6, value: this.getQr() }));
		} else {
			this.viewSecret('');
			this.viewUrlTitle('');
			this.viewUrl('');
		}
	}

	onBuild() {
		if (this.capaTwoFactor) {
			this.processing(true);
			Remote.getTwoFactor(this.onResult);
		}
	}
}

export { TwoFactorConfigurationPopupView, TwoFactorConfigurationPopupView as default };
