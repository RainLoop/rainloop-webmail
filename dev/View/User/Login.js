import ko from 'ko';

import {
	LoginSignMeType,
	LoginSignMeTypeAsString,
	ClientSideKeyName,
	StorageResultType,
	Notification
} from 'Common/Enums';

import { convertLangName, triggerAutocompleteInputChange } from 'Common/Utils';

import { getNotification, getNotificationFromResponse, reload as translatorReload } from 'Common/Translator';

import * as Plugins from 'Common/Plugins';

import AppStore from 'Stores/User/App';
import LanguageStore from 'Stores/Language';

import * as Settings from 'Storage/Settings';
import * as Local from 'Storage/Client';

import Remote from 'Remote/User/Ajax';

import { getApp } from 'Helper/Apps/User';

import { view, command, ViewType, routeOff, showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@view({
	name: ['View/App/Login', 'View/User/Login'],
	type: ViewType.Center,
	templateID: 'Login'
})
class LoginUserView extends AbstractViewNext {
	constructor() {
		super();

		this.hideSubmitButton = !!Settings.appSettingsGet('hideSubmitButton');

		this.welcome = ko.observable(!!Settings.settingsGet('UseLoginWelcomePage'));

		this.email = ko.observable('');
		this.password = ko.observable('');
		this.signMe = ko.observable(false);

		this.additionalCode = ko.observable('');
		this.additionalCode.error = ko.observable(false);
		this.additionalCode.errorAnimation = ko.observable(false).extend({ falseTimeout: 500 });
		this.additionalCode.focused = ko.observable(false);
		this.additionalCode.visibility = ko.observable(false);
		this.additionalCodeSignMe = ko.observable(false);

		this.logoImg = (Settings.settingsGet('LoginLogo')||'').trim();
		this.loginDescription = (Settings.settingsGet('LoginDescription')||'').trim();

		this.mobile = !!Settings.appSettingsGet('mobile');
		this.mobileDevice = !!Settings.appSettingsGet('mobileDevice');

		this.forgotPasswordLinkUrl = Settings.appSettingsGet('forgotPasswordLinkUrl');
		this.registrationLinkUrl = Settings.appSettingsGet('registrationLinkUrl');

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

		this.emailFocus = ko.observable(false);
		this.passwordFocus = ko.observable(false);

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

		if (Settings.settingsGet('AdditionalLoginError') && !this.submitError()) {
			this.submitError(Settings.settingsGet('AdditionalLoginError'));
		}
	}

	windowOpenFeatures(wh) {
		return `left=200,top=100,width=${wh},height=${wh},menubar=no,status=no,resizable=yes,scrollbars=yes`;
	}

	@command((self) => !self.submitRequest())
	submitCommand() {
		triggerAutocompleteInputChange();

		this.emailError(false);
		this.passwordError(false);

		this.emailError(!this.email().trim());
		this.passwordError(!this.password().trim());

		if (this.additionalCode.visibility()) {
			this.additionalCode.error(false);
			this.additionalCode.error(!this.additionalCode().trim());
		}

		if (
			this.emailError() ||
			this.passwordError() ||
			(this.additionalCode.visibility() && this.additionalCode.error())
		) {
			switch (true) {
				case this.emailError():
					this.emailFocus(true);
					break;
				case this.passwordError():
					this.passwordFocus(true);
					break;
				case this.additionalCode.visibility() && this.additionalCode.error():
					this.additionalCode.focused(true);
					break;
				// no default
			}

			return false;
		}

		let pluginResultCode = 0,
			pluginResultMessage = '';

		const fSubmitResult = (iResultCode, sResultMessage) => {
			pluginResultCode = iResultCode || 0;
			pluginResultMessage = sResultMessage || '';
		};

		Plugins.runHook('user-login-submit', [fSubmitResult]);
		if (0 < pluginResultCode) {
			this.submitError(getNotification(pluginResultCode));
			return false;
		} else if (pluginResultMessage) {
			this.submitError(pluginResultMessage);
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

								setTimeout(() => this.additionalCode.focused(true), 100);
							} else if (oData.Admin) {
								getApp().redirectToAdminPanel();
							} else {
								getApp().loginAndLogoutReload(false);
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

	onShowWithDelay() {
		if (this.email() && this.password()) {
			this.passwordFocus(true);
		} else if (!this.email()) {
			this.emailFocus(true);
		} else if (!this.password()) {
			this.passwordFocus(true);
		} else {
			this.emailFocus(true);
		}
	}

	onHide() {
		this.emailFocus(false);
		this.passwordFocus(false);
	}

	onBuild() {
		const signMeLocal = Local.get(ClientSideKeyName.LastSignMe),
			signMe = (Settings.settingsGet('SignMe') || 'unused').toLowerCase();

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

		triggerAutocompleteInputChange(true);
	}

	submitForm() {
		this.submitCommand();
	}

	selectLanguage() {
		showScreenPopup(require('View/Popup/Languages'), [this.language, this.languages(), LanguageStore.userLanguage()]);
	}

	selectLanguageOnTab(bShift) {
		if (!bShift) {
			setTimeout(() => {
				this.emailFocus(true);
			}, 50);

			return false;
		}

		return true;
	}
}

export { LoginUserView, LoginUserView as default };
