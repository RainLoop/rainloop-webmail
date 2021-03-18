import ko from 'ko';

import {
	Notification
} from 'Common/Enums';

import { ClientSideKeyName } from 'Common/EnumsUser';

import { getNotification, reload as translatorReload, convertLangName } from 'Common/Translator';

import { LanguageStore } from 'Stores/Language';

import * as Local from 'Storage/Client';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands, showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewCenter } from 'Knoin/AbstractViews';

import { Settings, SettingsGet } from 'Common/Globals';

import { LanguagesPopupView } from 'View/Popup/Languages';

const
	LoginSignMeType = {
		DefaultOff: 0,
		DefaultOn: 1,
		Unused: 2
	},

	LoginSignMeTypeAsString = {
		DefaultOff: 'defaultoff',
		DefaultOn: 'defaulton',
		Unused: 'unused'
	};


class LoginUserView extends AbstractViewCenter {
	constructor() {
		super('User/Login', 'Login');

		this.hideSubmitButton = Settings.app('hideSubmitButton');

		this.addObservables({
			loadingDesc: SettingsGet('LoadingDescription'),

			email: SettingsGet('DevEmail'),
			password: SettingsGet('DevPassword'),
			signMe: false,
			additionalCode: '',

			emailError: false,
			passwordError: false,

			formHidden: false,

			submitRequest: false,
			submitError: '',
			submitErrorAddidional: '',

			langRequest: false,

			additionalCodeError: false,
			additionalCodeSignMe: false,
			additionalCodeVisibility: false,
			signMeType: LoginSignMeType.Unused
		});

		this.forgotPasswordLinkUrl = Settings.app('forgotPasswordLinkUrl');
		this.registrationLinkUrl = Settings.app('registrationLinkUrl');

		this.formError = ko.observable(false).extend({ falseTimeout: 500 });

		this.allowLanguagesOnLogin = !!SettingsGet('AllowLanguagesOnLogin');

		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;

		this.bSendLanguage = false;

		this.addComputables({

			languageFullName: () => convertLangName(this.language()),

			signMeVisibility: () => LoginSignMeType.Unused !== this.signMeType()
		});

		this.addSubscribables({
			email: () => {
				this.emailError(false);
				this.additionalCode('');
				this.additionalCodeVisibility(false);
			},

			password: () => this.passwordError(false),

			additionalCode: () => this.additionalCodeError(false),
			additionalCodeError: bV => this.formError(!!bV),
			additionalCodeVisibility: () => this.additionalCodeError(false),

			emailError: bV => this.formError(!!bV),

			passwordError: bV => this.formError(!!bV),

			submitError: value => value || this.submitErrorAddidional(''),

			signMeType: iValue => this.signMe(LoginSignMeType.DefaultOn === iValue)
		});

		if (SettingsGet('AdditionalLoginError') && !this.submitError()) {
			this.submitError(SettingsGet('AdditionalLoginError'));
		}

		decorateKoCommands(this, {
			submitCommand: self => !self.submitRequest()
		});
	}

	windowOpenFeatures(wh) {
		return `left=200,top=100,width=${wh},height=${wh},menubar=no,status=no,resizable=yes,scrollbars=yes`;
	}

	submitCommand() {
		this.emailError(false);
		this.passwordError(false);

		let error;
		if (this.additionalCodeVisibility()) {
			this.additionalCodeError(false);
			if (!this.additionalCode().trim()) {
				this.additionalCodeError(true);
				error = '.inputAdditionalCode';
			}
		}
		if (!this.password().trim()) {
			this.passwordError(true);
			error = '#RainLoopPassword';
		}
		if (!this.email().trim()) {
			this.emailError(true);
			error = '#RainLoopEmail';
		}
		if (error) {
			this.querySelector(error).focus();
			return false;
		}

		this.submitRequest(true);

		const fLoginRequest = (sLoginPassword) => {
			Remote.login(
				(iError, oData) => {
					this.submitRequest(false);
					if (iError) {
						if (Notification.InvalidInputArgument == iError) {
							iError = Notification.AuthError;
						}
						this.submitError(getNotification(iError, oData.ErrorMessage, Notification.UnknownNotification));
						this.submitErrorAddidional((oData && oData.ErrorMessageAdditional) || '');
					} else {
						if (oData.TwoFactorAuth) {
							this.additionalCode('');
							this.additionalCodeVisibility(true);
							setTimeout(() => this.querySelector('.inputAdditionalCode').focus(), 100);
						} else {
							rl.route.reload();
						}
					}
				},
				this.email(),
				'',
				sLoginPassword,
				!!this.signMe(),
				this.bSendLanguage ? this.language() : '',
				this.additionalCodeVisibility() ? this.additionalCode() : '',
				this.additionalCodeVisibility() ? !!this.additionalCodeSignMe() : false
			);

			Local.set(ClientSideKeyName.LastSignMe, this.signMe() ? '-1-' : '-0-');
		};

		fLoginRequest(this.password());

		return true;
	}

	onShow() {
		rl.route.off();
	}

	onBuild() {
		const signMeLocal = Local.get(ClientSideKeyName.LastSignMe),
			signMe = (SettingsGet('SignMe') || 'unused').toLowerCase();

		switch (signMe) {
			case LoginSignMeTypeAsString.DefaultOff:
			case LoginSignMeTypeAsString.DefaultOn:
				this.signMeType(
					LoginSignMeTypeAsString.DefaultOn === signMe ? LoginSignMeType.DefaultOn : LoginSignMeType.DefaultOff
				);

				switch (signMeLocal) {
					case '-1-':
						this.signMeType(LoginSignMeType.DefaultOn);
						break;
					case '-0-':
						this.signMeType(LoginSignMeType.DefaultOff);
						break;
					// no default
				}

				break;
			case LoginSignMeTypeAsString.Unused:
			default:
				this.signMeType(LoginSignMeType.Unused);
				break;
		}

		setTimeout(() => {
			LanguageStore.language.subscribe((value) => {
				this.langRequest(true);

				translatorReload(false, value).then(
					() => {
						this.langRequest(false);
						this.bSendLanguage = true;
					},
					() => {
						this.langRequest(false);
					}
				);
			});
		}, 50);
	}

	submitForm() {
		this.submitCommand();
	}

	selectLanguage() {
		showScreenPopup(LanguagesPopupView, [this.language, this.languages(), LanguageStore.userLanguage()]);
	}
}

export { LoginUserView };
