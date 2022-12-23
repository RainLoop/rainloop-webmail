import { Notification } from 'Common/Enums';
import { ClientSideKeyNameLastSignMe } from 'Common/EnumsUser';
import { SettingsGet, fireEvent } from 'Common/Globals';
import { getNotification, translatorReload, convertLangName } from 'Common/Translator';
import { addObservablesTo, addComputablesTo, addSubscribablesTo } from 'External/ko';

import { LanguageStore } from 'Stores/Language';

import * as Local from 'Storage/Client';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands, showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewLogin } from 'Knoin/AbstractViews';

import { LanguagesPopupView } from 'View/Popup/Languages';

const
	SignMeOff = 0,
	SignMeOn = 1,
	SignMeUnused = 2;


export class LoginUserView extends AbstractViewLogin {
	constructor() {
		super();

		addObservablesTo(this, {
			loadingDesc: SettingsGet('LoadingDescription'),

			email: SettingsGet('DevEmail'),
			password: SettingsGet('DevPassword'),
			signMe: false,

			emailError: false,
			passwordError: false,

			submitRequest: false,
			submitError: '',
			submitErrorAdditional: '',

			langRequest: false,

			signMeType: SignMeUnused
		});

		this.allowLanguagesOnLogin = !!SettingsGet('AllowLanguagesOnLogin');

		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;

		this.bSendLanguage = false;

		addComputablesTo(this, {

			languageFullName: () => convertLangName(this.language()),

			signMeVisibility: () => SignMeUnused !== this.signMeType()
		});

		addSubscribablesTo(this, {
			email: () => this.emailError(false),

			password: () => this.passwordError(false),

			submitError: value => value || this.submitErrorAdditional(''),

			signMeType: iValue => this.signMe(SignMeOn === iValue),

			language: value => {
				this.langRequest(true);
				translatorReload(value).then(
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

	hideError() {
		this.submitError('');
	}

	toggleSignMe() {
		this.signMe(!this.signMe());
	}

	submitCommand(self, event) {
		const email = this.email().trim();
		this.email(email);

		let form = event.target.form,
			data = new FormData(form),
			valid = form.reportValidity() && fireEvent('sm-user-login', data, 1);

		this.emailError(!email);
		this.passwordError(!this.password());
		this.formError(!valid);

		if (valid) {
			this.submitRequest(true);
			data.set('Language', this.bSendLanguage ? this.language() : '');
			data.set('SignMe', this.signMe() ? 1 : 0);
			Remote.request('Login',
				(iError, oData) => {
					fireEvent('sm-user-login-response', {
						error: iError,
						data: oData
					});
					if (iError) {
						this.submitRequest(false);
						if (Notification.InvalidInputArgument == iError) {
							iError = Notification.AuthError;
						}
						this.submitError(getNotification(iError, oData?.ErrorMessage,
							Notification.UnknownNotification));
						this.submitErrorAdditional(oData?.ErrorMessageAdditional);
					} else {
						rl.setData(oData.Result);
					}
				},
				data
			);

			Local.set(ClientSideKeyNameLastSignMe, this.signMe() ? '-1-' : '-0-');
		}

		return valid;
	}

	onBuild(dom) {
		super.onBuild(dom);

		const signMe = (SettingsGet('SignMe') || '').toLowerCase();

		switch (signMe) {
			case 'defaultoff':
			case 'defaulton':
				this.signMeType(
					'defaulton' === signMe ? SignMeOn : SignMeOff
				);

				switch (Local.get(ClientSideKeyNameLastSignMe)) {
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

	selectLanguage() {
		showScreenPopup(LanguagesPopupView, [this.language, this.languages(), LanguageStore.userLanguage()]);
	}
}
