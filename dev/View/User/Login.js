import ko from 'ko';

import {
	LoginSignMeType,
	LoginSignMeTypeAsString,
	ClientSideKeyName,
	StorageResultType,
	Notification
} from 'Common/Enums';

import { convertLangName } from 'Common/Utils';

import { getNotification, getNotificationFromResponse, reload as translatorReload } from 'Common/Translator';

import AppStore from 'Stores/User/App';
import LanguageStore from 'Stores/Language';

import * as Local from 'Storage/Client';

import Remote from 'Remote/User/Fetch';

import { view, command, ViewType, routeOff, showScreenPopup, routeReload } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

import { rootAdmin } from 'Common/Links';

const Settings = rl.settings;

@view({
	name: ['View/App/Login', 'View/User/Login'],
	type: ViewType.Center,
	templateID: 'Login'
})
class LoginUserView extends AbstractViewNext {
	constructor() {
		super();

		this.hideSubmitButton = Settings.app('hideSubmitButton') ? '' : null;

		this.welcome = ko.observable(!!Settings.get('UseLoginWelcomePage'));

		this.email = ko.observable('');
		this.password = ko.observable('');
		this.signMe = ko.observable(false);

		this.additionalCode = ko.observable('');
		this.additionalCode.error = ko.observable(false);
		this.additionalCode.errorAnimation = ko.observable(false).extend({ falseTimeout: 500 });
		this.additionalCode.visibility = ko.observable(false);
		this.additionalCodeSignMe = ko.observable(false);

		this.logoImg = (Settings.get('LoginLogo')||'').trim();
		this.loginDescription = (Settings.get('LoginDescription')||'').trim();

		this.mobile = !!Settings.app('mobile');
		this.mobileDevice = !!Settings.app('mobileDevice');

		this.forgotPasswordLinkUrl = Settings.app('forgotPasswordLinkUrl');
		this.registrationLinkUrl = Settings.app('registrationLinkUrl');

		this.emailError = ko.observable(false);
		this.passwordError = ko.observable(false);

		this.emailErrorAnimation = ko.observable(false).extend({ falseTimeout: 500 });
		this.passwordErrorAnimation = ko.observable(false).extend({ falseTimeout: 500 });

		this.formHidden = ko.observable(false);

		this.formError = ko.computed(
			() =>
				this.emailErrorAnimation() ||
				this.passwordErrorAnimation() ||
				(this.additionalCode.visibility() && this.additionalCode.errorAnimation())
		);

		this.email.subscribe(() => {
			this.emailError(false);
			this.additionalCode('');
			this.additionalCode.visibility(false);
		});

		this.password.subscribe(() => {
			this.passwordError(false);
		});

		this.additionalCode.subscribe(() => {
			this.additionalCode.error(false);
		});

		this.additionalCode.visibility.subscribe(() => {
			this.additionalCode.error(false);
		});

		this.emailError.subscribe((bV) => {
			this.emailErrorAnimation(!!bV);
		});

		this.passwordError.subscribe((bV) => {
			this.passwordErrorAnimation(!!bV);
		});

		this.additionalCode.error.subscribe((bV) => {
			this.additionalCode.errorAnimation(!!bV);
		});

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');
		this.submitErrorAddidional = ko.observable('');

		this.submitError.subscribe((value) => {
			if (!value) {
				this.submitErrorAddidional('');
			}
		});

		this.allowLanguagesOnLogin = AppStore.allowLanguagesOnLogin;

		this.langRequest = ko.observable(false);
		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;

		this.bSendLanguage = false;

		this.languageFullName = ko.computed(() => convertLangName(this.language()));

		this.signMeType = ko.observable(LoginSignMeType.Unused);

		this.signMeType.subscribe((iValue) => {
			this.signMe(LoginSignMeType.DefaultOn === iValue);
		});

		this.signMeVisibility = ko.computed(() => LoginSignMeType.Unused !== this.signMeType());

		if (Settings.get('AdditionalLoginError') && !this.submitError()) {
			this.submitError(Settings.get('AdditionalLoginError'));
		}
	}

	windowOpenFeatures(wh) {
		return `left=200,top=100,width=${wh},height=${wh},menubar=no,status=no,resizable=yes,scrollbars=yes`;
	}

	@command((self) => !self.submitRequest())
	submitCommand() {
		this.emailError(false);
		this.passwordError(false);

		let error;
		if (this.additionalCode.visibility()) {
			this.additionalCode.error(false);
			if (!this.additionalCode().trim()) {
				this.additionalCode.error(true);
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
				(sResult, oData) => {
					if (StorageResultType.Success === sResult && oData && 'Login' === oData.Action) {
						if (oData.Result) {
							if (oData.TwoFactorAuth) {
								this.additionalCode('');
								this.additionalCode.visibility(true);
								this.submitRequest(false);

								setTimeout(() => this.querySelector('.inputAdditionalCode').focus(), 100);
							} else if (oData.Admin) {
								setTimeout(() => location.href = rootAdmin(), 100);
							} else {
								routeReload();
							}
						} else if (oData.ErrorCode) {
							this.submitRequest(false);
							if ([Notification.InvalidInputArgument].includes(oData.ErrorCode)) {
								oData.ErrorCode = Notification.AuthError;
							}

							this.submitError(getNotificationFromResponse(oData));

							if (!this.submitError()) {
								this.submitError(getNotification(Notification.UnknownError));
							} else if (oData.ErrorMessageAdditional) {
								this.submitErrorAddidional(oData.ErrorMessageAdditional);
							}
						} else {
							this.submitRequest(false);
						}
					} else {
						this.submitRequest(false);
						this.submitError(getNotification(Notification.UnknownError));
					}
				},
				this.email(),
				'',
				sLoginPassword,
				!!this.signMe(),
				this.bSendLanguage ? this.language() : '',
				this.additionalCode.visibility() ? this.additionalCode() : '',
				this.additionalCode.visibility() ? !!this.additionalCodeSignMe() : false
			);

			Local.set(ClientSideKeyName.LastSignMe, this.signMe() ? '-1-' : '-0-');
		};

		fLoginRequest(this.password());

		return true;
	}

	displayMainForm() {
		this.welcome(false);
	}

	onShow() {
		routeOff();
	}

	onBuild() {
		const signMeLocal = Local.get(ClientSideKeyName.LastSignMe),
			signMe = (Settings.get('SignMe') || 'unused').toLowerCase();

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

		this.email(AppStore.devEmail);
		this.password(AppStore.devPassword);

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
		showScreenPopup(require('View/Popup/Languages'), [this.language, this.languages(), LanguageStore.userLanguage()]);
	}
}

export { LoginUserView, LoginUserView as default };
