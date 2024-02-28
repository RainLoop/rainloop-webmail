import { Notifications } from 'Common/Enums';
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
			loadingDesc: SettingsGet('loadingDescription'),

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

		this.allowLanguagesOnLogin = !!SettingsGet('allowLanguagesOnLogin');

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
			data.set('language', this.bSendLanguage ? this.language() : '');
			data.set('signMe', this.signMe() ? 1 : 0);
			Remote.request('Login',
				(iError, oData) => {
					fireEvent('sm-user-login-response', {
						error: iError,
						data: oData
					});
					if (iError) {
						this.submitRequest(false);
						if (Notifications.InvalidInputArgument == iError) {
							iError = Notifications.AuthError;
						}
						this.submitError(getNotification(iError, oData?.ErrorMessage,
							Notifications.UnknownNotification));
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

		let signMe = (SettingsGet('signMe') || '').toLowerCase();
		switch (signMe) {
			case SignMeOff:
			case SignMeOn:
				switch (Local.get(ClientSideKeyNameLastSignMe)) {
					case '-1-':
						signMe = SignMeOn;
						break;
					case '-0-':
						signMe = SignMeOff;
						break;
					// no default
				}
				this.signMeType(signMe);
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
