import ko from 'ko';

import { Notification } from 'Common/Enums';
import { ClientSideKeyName } from 'Common/EnumsUser';
import { Settings, SettingsGet } from 'Common/Globals';
import { getNotification, reload as translatorReload, convertLangName } from 'Common/Translator';

import { LanguageStore } from 'Stores/Language';

import * as Local from 'Storage/Client';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands, showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewCenter } from 'Knoin/AbstractViews';

import { LanguagesPopupView } from 'View/Popup/Languages';

const SignMeOff = 0,
	SignMeOn = 1,
	SignMeUnused = 2;


class LoginUserView extends AbstractViewCenter {
	constructor() {
		super('Login');

		this.hideSubmitButton = Settings.app('hideSubmitButton');

		this.addObservables({
			loadingDesc: SettingsGet('LoadingDescription'),

			email: SettingsGet('DevEmail'),
			password: SettingsGet('DevPassword'),
			signMe: false,

			emailError: false,
			passwordError: false,

			submitRequest: false,
			submitError: '',
			submitErrorAddidional: '',

			langRequest: false,

			signMeType: SignMeUnused
		});

		this.formError = ko.observable(false).extend({ falseTimeout: 500 });

		this.allowLanguagesOnLogin = !!SettingsGet('AllowLanguagesOnLogin');

		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;

		this.bSendLanguage = false;

		this.addComputables({

			languageFullName: () => convertLangName(this.language()),

			signMeVisibility: () => SignMeUnused !== this.signMeType()
		});

		this.addSubscribables({
			email: () => this.emailError(false),

			password: () => this.passwordError(false),

			submitError: value => value || this.submitErrorAddidional(''),

			signMeType: iValue => this.signMe(SignMeOn === iValue),

			language: value => {
				this.langRequest(true);
				translatorReload(false, value).then(
					() => {
						this.langRequest(false);
						this.bSendLanguage = true;
					},
					() => this.langRequest(false)
				);
			}
		});

		if (SettingsGet('AdditionalLoginError') && !this.submitError()) {
			this.submitError(SettingsGet('AdditionalLoginError'));
		}

		decorateKoCommands(this, {
			submitCommand: self => !self.submitRequest()
		});
	}

	submitCommand(self, event) {
		let form = event.target.form,
			data = new FormData(form),
			valid = form.reportValidity();

		this.emailError(!this.email());
		this.passwordError(!this.password());
		this.formError(!valid);

		if (valid) {
			this.submitRequest(true);
			data.set('Language', this.bSendLanguage ? this.language() : '');
			data.set('SignMe', this.signMe() ? 1 : 0);
			Remote.login(
				(iError, oData) => {
					if (iError) {
						this.submitRequest(false);
						if (Notification.InvalidInputArgument == iError) {
							iError = Notification.AuthError;
						}
						this.submitError(getNotification(iError, (oData ? oData.ErrorMessage : ''),
							Notification.UnknownNotification));
						this.submitErrorAddidional((oData && oData.ErrorMessageAdditional) || '');
					} else {
						rl.route.reload();
					}
				},
				data
			);

			Local.set(ClientSideKeyName.LastSignMe, this.signMe() ? '-1-' : '-0-');
		}

		return valid;
	}

	onShow() {
		rl.route.off();
	}

	onBuild() {
		const signMeLocal = Local.get(ClientSideKeyName.LastSignMe),
			signMe = (SettingsGet('SignMe') || '').toLowerCase();

		switch (signMe) {
			case 'defaultoff':
			case 'defaulton':
				this.signMeType(
					'defaulton' === signMe ? SignMeOn : SignMeOff
				);

				switch (signMeLocal) {
					case '-1-':
						this.signMeType(SignMeOn);
						break;
					case '-0-':
						this.signMeType(SignMeOff);
						break;
					// no default
				}

				break;
			default:
				this.signMeType(SignMeUnused);
				break;
		}
	}

	submitForm() {
//		return false;
	}

	selectLanguage() {
		showScreenPopup(LanguagesPopupView, [this.language, this.languages(), LanguageStore.userLanguage()]);
	}
}

export { LoginUserView };
