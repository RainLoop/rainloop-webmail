/*
import { trigger as translatorTrigger } from 'Common/Translator';
*/

(rl => { if (rl) {

const
	pString = value => null != value ? '' + value : '',

	Remote = new class {
		/**
		 * @param {?Function} fCallback
		 * @param {string} sCode
		 */
		verifyCode(fCallback, sCode) {
			rl.pluginRemoteRequest(fCallback, 'VerifyTwoFactorCode', {
				Code: sCode
			});
		}

		/**
		 * @param {?Function} fCallback
		 * @param {boolean} bEnable
		 */
		enableTwoFactor(fCallback, bEnable) {
			rl.pluginRemoteRequest(fCallback, 'EnableTwoFactor', {
				Enable: bEnable ? 1 : 0
			});
		}
	};

class TwoFactorAuthSettings
{

	constructor() {
		this.lock = ko.observable(false);

		this.processing = ko.observable(false);
		this.clearing = ko.observable(false);
		this.secreting = ko.observable(false);

		this.viewUser = ko.observable('');
		this.twoFactorStatus = ko.observable(false);

		this.twoFactorTested = ko.observable(false);

		this.viewSecret = ko.observable('');
		this.viewBackupCodes = ko.observable('');
		this.viewUrlTitle = ko.observable('');
		this.viewUrl = ko.observable('');

		this.viewEnable_ = ko.observable(false);

		const fn = iError => iError && this.viewEnable_(false);
		Object.entries({
			viewEnable: {
				read: this.viewEnable_,
				write: (value) => {
					value = !!value;
					if (value && this.twoFactorTested()) {
						this.viewEnable_(value);
						Remote.enableTwoFactor(fn, value);
					} else {
						if (!value) {
							this.viewEnable_(value);
						}
						Remote.enableTwoFactor(fn, false);
					}
				}
			},

			viewTwoFactorEnableTooltip: () => {
//				translatorTrigger();
				return this.twoFactorTested() || this.viewEnable_()
					? ''
					: rl.i18n('POPUPS_TWO_FACTOR_CFG/TWO_FACTOR_SECRET_TEST_BEFORE_DESC');
			},

			viewTwoFactorStatus: () => {
//				translatorTrigger();
				return rl.i18n('POPUPS_TWO_FACTOR_CFG/TWO_FACTOR_SECRET_'
					+ (this.twoFactorStatus() ? '' : 'NOT_')
					+ 'CONFIGURED_DESC'
				);
			},

			twoFactorAllowedEnable: () => this.viewEnable() || this.twoFactorTested()
		}).forEach(([key, fn]) => this[key] = ko.computed(fn));

		this.onResult = this.onResult.bind(this);
		this.onShowSecretResult = this.onShowSecretResult.bind(this);
	}

	configureTwoFactor() {
//		showScreenPopup(require('View/Popup/TwoFactorConfiguration'));
	}

	showSecret() {
		this.secreting(true);
		rl.pluginRemoteRequest(this.onShowSecretResult, 'ShowTwoFactorSecret');
	}

	hideSecret() {
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrlTitle('');
		this.viewUrl('');
	}

	createTwoFactor() {
		this.processing(true);
		rl.pluginRemoteRequest(this.onResult, 'CreateTwoFactorSecret');
	}

	logout() {
		rl.app.logout();
	}

	testTwoFactor() {
		rl.showPluginPopup(TwoFactorAuthTestPopupView, [this.twoFactorTested]);
	}

	clearTwoFactor() {
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrlTitle('');
		this.viewUrl('');

		this.twoFactorTested(false);

		this.clearing(true);
		rl.pluginRemoteRequest(this.onResult, 'ClearTwoFactorInfo');
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
		return 'otpauth://totp/' + encodeURIComponent(this.viewUser())
			+ '?secret=' + encodeURIComponent(this.viewSecret())
			+ '&issuer=' + encodeURIComponent('');
	}

	onResult(iError, oData) {
		this.processing(false);
		this.clearing(false);

		if (iError) {
			this.viewUser('');
			this.viewEnable_(false);
			this.twoFactorStatus(false);
			this.twoFactorTested(false);

			this.viewSecret('');
			this.viewBackupCodes('');
			this.viewUrlTitle('');
			this.viewUrl('');
		} else {
			this.viewUser(pString(oData.Result.User));
			this.viewEnable_(!!oData.Result.Enable);
			this.twoFactorStatus(!!oData.Result.IsSet);
			this.twoFactorTested(!!oData.Result.Tested);

			this.viewSecret(pString(oData.Result.Secret));
			this.viewBackupCodes(pString(oData.Result.BackupCodes).replace(/[\s]+/g, '  '));

			this.viewUrlTitle(pString(oData.Result.UrlTitle));
			this.viewUrl(null/*qr.toDataURL({ level: 'M', size: 8, value: this.getQr() })*/);
		}
	}

	onShowSecretResult(iError, data) {
		this.secreting(false);

		if (iError) {
			this.viewSecret('');
			this.viewUrlTitle('');
			this.viewUrl('');
		} else {
			this.viewSecret(pString(data.Result.Secret));
			this.viewUrlTitle(pString(data.Result.UrlTitle));
			this.viewUrl(null/*qr.toDataURL({ level: 'M', size: 6, value: this.getQr() })*/);
		}
	}

	onBuild() {
		this.processing(true);
		rl.pluginRemoteRequest(this.onResult, 'GetTwoFactorInfo');
	}
}

class TwoFactorAuthTestPopupView extends rl.pluginPopupView {
	constructor() {
		super('TwoFactorAuthTest');

		this.addObservables({
			code: '',
			codeStatus: null,

			testing: false
		});

		this.koTestedTrigger = null;

		ko.decorateCommands(this, {
			testCodeCommand: self => self.code() && !self.testing()
		});
	}

	testCodeCommand() {
		this.testing(true);
		Remote.verifyCode(iError => {
			this.testing(false);
			this.codeStatus(!iError);

			if (this.koTestedTrigger && this.codeStatus()) {
				this.koTestedTrigger(true);
			}
		}, this.code());
	}

	clearPopup() {
		this.code('');
		this.codeStatus(null);
		this.testing(false);

		this.koTestedTrigger = null;
	}

	onShow(koTestedTrigger) {
		this.clearPopup();

		this.koTestedTrigger = koTestedTrigger;
	}
}

rl.addSettingsViewModel(
	TwoFactorAuthSettings,
	'TwoFactorAuthSettings',
	'POPUPS_TWO_FACTOR_CFG/LEGEND_TWO_FACTOR_AUTH',
	'two-factor-auth'
);

}})(window.rl);
