
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),

		Translator = require('Common/Translator'),

		Plugins = require('Common/Plugins'),

		LanguageStore = require('Stores/Language'),
		AppStore = require('Stores/User/App'),

		Local = require('Storage/Client'),
		Settings = require('Storage/Settings'),

		Remote = require('Remote/User/Ajax'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function LoginUserView()
	{
		AbstractView.call(this, 'Center', 'Login');

		this.welcome = ko.observable(!!Settings.settingsGet('UseLoginWelcomePage'));

		this.email = ko.observable('');
		this.password = ko.observable('');
		this.signMe = ko.observable(false);

		this.additionalCode = ko.observable('');
		this.additionalCode.error = ko.observable(false);
		this.additionalCode.errorAnimation = ko.observable(false).extend({'falseTimeout': 500});
		this.additionalCode.focused = ko.observable(false);
		this.additionalCode.visibility = ko.observable(false);
		this.additionalCodeSignMe = ko.observable(false);

		this.logoImg = Utils.trim(Settings.settingsGet('LoginLogo'));
		this.logoPowered = !!Settings.settingsGet('LoginPowered');
		this.loginDescription = Utils.trim(Settings.settingsGet('LoginDescription'));

		this.forgotPasswordLinkUrl = Settings.settingsGet('ForgotPasswordLinkUrl');
		this.registrationLinkUrl = Settings.settingsGet('RegistrationLinkUrl');

		this.emailError = ko.observable(false);
		this.passwordError = ko.observable(false);

		this.emailErrorAnimation = ko.observable(false).extend({'falseTimeout': 500});
		this.passwordErrorAnimation = ko.observable(false).extend({'falseTimeout': 500});

		this.formHidden = ko.observable(false);

		this.formError = ko.computed(function () {
			return this.emailErrorAnimation() || this.passwordErrorAnimation() ||
				(this.additionalCode.visibility() && this.additionalCode.errorAnimation());
		}, this);

		this.emailFocus = ko.observable(false);
		this.passwordFocus = ko.observable(false);
		this.submitFocus = ko.observable(false);

		this.email.subscribe(function () {
			this.emailError(false);
			this.additionalCode('');
			this.additionalCode.visibility(false);
		}, this);

		this.password.subscribe(function () {
			this.passwordError(false);
		}, this);

		this.additionalCode.subscribe(function () {
			this.additionalCode.error(false);
		}, this);

		this.additionalCode.visibility.subscribe(function () {
			this.additionalCode.error(false);
		}, this);

		this.emailError.subscribe(function (bV) {
			this.emailErrorAnimation(!!bV);
		}, this);

		this.passwordError.subscribe(function (bV) {
			this.passwordErrorAnimation(!!bV);
		}, this);

		this.additionalCode.error.subscribe(function (bV) {
			this.additionalCode.errorAnimation(!!bV);
		}, this);

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');
		this.submitErrorAddidional = ko.observable('');

		this.submitError.subscribe(function (sValue) {
			if ('' === sValue)
			{
				this.submitErrorAddidional('');
			}
		}, this);

		this.allowLanguagesOnLogin = AppStore.allowLanguagesOnLogin;

		this.langRequest = ko.observable(false);
		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;

		this.bSendLanguage = false;

		this.languageFullName = ko.computed(function () {
			return Utils.convertLangName(this.language());
		}, this);

		this.signMeType = ko.observable(Enums.LoginSignMeType.Unused);

		this.signMeType.subscribe(function (iValue) {
			this.signMe(Enums.LoginSignMeType.DefaultOn === iValue);
		}, this);

		this.signMeVisibility = ko.computed(function () {
			return Enums.LoginSignMeType.Unused !== this.signMeType();
		}, this);

		this.submitCommand = Utils.createCommand(this, function () {

			Utils.triggerAutocompleteInputChange();

			this.emailError(false);
			this.passwordError(false);

			this.emailError('' === Utils.trim(this.email()));
			this.passwordError('' === Utils.trim(this.password()));

			if (this.additionalCode.visibility())
			{
				this.additionalCode.error(false);
				this.additionalCode.error('' === Utils.trim(this.additionalCode()));
			}

			if (this.emailError() || this.passwordError() ||
				(this.additionalCode.visibility() && this.additionalCode.error()))
			{
				switch (true)
				{
					case this.emailError():
						this.emailFocus(true);
						break;
					case this.passwordError():
						this.passwordFocus(true);
						break;
					case this.additionalCode.visibility() && this.additionalCode.error():
						this.additionalCode.focused(true);
						break;
				}

				return false;
			}

			var
				iPluginResultCode = 0,
				sPluginResultMessage = '',
				fSubmitResult = function (iResultCode, sResultMessage) {
					iPluginResultCode = iResultCode || 0;
					sPluginResultMessage = sResultMessage || '';
				}
			;

			Plugins.runHook('user-login-submit', [fSubmitResult]);
			if (0 < iPluginResultCode)
			{
				this.submitError(Translator.getNotification(iPluginResultCode));
				return false;
			}
			else if ('' !== sPluginResultMessage)
			{
				this.submitError(sPluginResultMessage);
				return false;
			}

			this.submitRequest(true);

			var
				sPassword = this.password(),

				fLoginRequest = _.bind(function (sPassword) {

					Remote.login(_.bind(function (sResult, oData) {

						if (Enums.StorageResultType.Success === sResult && oData && 'Login' === oData.Action)
						{
							if (oData.Result)
							{
								if (oData.TwoFactorAuth)
								{
									this.additionalCode('');
									this.additionalCode.visibility(true);
									this.additionalCode.focused(true);

									this.submitRequest(false);
								}
								else if (oData.Admin)
								{
									require('App/User').redirectToAdminPanel();
								}
								else
								{
									require('App/User').loginAndLogoutReload(false);
								}
							}
							else if (oData.ErrorCode)
							{
								this.submitRequest(false);
								if (-1 < Utils.inArray(oData.ErrorCode, [Enums.Notification.InvalidInputArgument]))
								{
									oData.ErrorCode = Enums.Notification.AuthError;
								}

								this.submitError(Translator.getNotification(oData.ErrorCode));

								if ('' === this.submitError())
								{
									this.submitError(Translator.getNotification(Enums.Notification.UnknownError));
								}
								else
								{
									if (oData.ErrorMessageAdditional)
									{
										this.submitErrorAddidional(oData.ErrorMessageAdditional);
									}
								}
							}
							else
							{
								this.submitRequest(false);
							}
						}
						else
						{
							this.submitRequest(false);
							this.submitError(Translator.getNotification(Enums.Notification.UnknownError));
						}

					}, this), this.email(), '', sPassword, !!this.signMe(),
						this.bSendLanguage ? this.language() : '',
						this.additionalCode.visibility() ? this.additionalCode() : '',
						this.additionalCode.visibility() ? !!this.additionalCodeSignMe() : false
					);

					Local.set(Enums.ClientSideKeyName.LastSignMe, !!this.signMe() ? '-1-' : '-0-');

				}, this)
			;

			if (!!Settings.settingsGet('UseRsaEncryption') && Utils.rsaEncode.supported &&
				Settings.settingsGet('RsaPublicKey'))
			{
				fLoginRequest(Utils.rsaEncode(sPassword, Settings.settingsGet('RsaPublicKey')));
			}
			else
			{
				fLoginRequest(sPassword);
			}

			return true;

		}, function () {
			return !this.submitRequest();
		});

		this.facebookLoginEnabled = ko.observable(false);

		this.facebookCommand = Utils.createCommand(this, function () {

			window.open(Links.socialFacebook(), 'Facebook',
				'left=200,top=100,width=650,height=450,menubar=no,status=no,resizable=yes,scrollbars=yes');

			return true;

		}, function () {
			return !this.submitRequest() && this.facebookLoginEnabled();
		});

		this.googleLoginEnabled = ko.observable(false);
		this.googleFastLoginEnabled = ko.observable(false);

		this.googleCommand = Utils.createCommand(this, function () {

			window.open(Links.socialGoogle(), 'Google',
				'left=200,top=100,width=650,height=500,menubar=no,status=no,resizable=yes,scrollbars=yes');

			return true;

		}, function () {
			return !this.submitRequest() && this.googleLoginEnabled();
		});

		this.googleFastCommand = Utils.createCommand(this, function () {

			window.open(Links.socialGoogle(true), 'Google',
				'left=200,top=100,width=650,height=500,menubar=no,status=no,resizable=yes,scrollbars=yes');

			return true;

		}, function () {
			return !this.submitRequest() && this.googleFastLoginEnabled();
		});

		this.twitterLoginEnabled = ko.observable(false);

		this.twitterCommand = Utils.createCommand(this, function () {

			window.open(Links.socialTwitter(), 'Twitter',
				'left=200,top=100,width=650,height=450,menubar=no,status=no,resizable=yes,scrollbars=yes');

			return true;

		}, function () {
			return !this.submitRequest() && this.twitterLoginEnabled();
		});

		this.socialLoginEnabled = ko.computed(function () {

			var
				bF = this.facebookLoginEnabled(),
				bG = this.googleLoginEnabled(),
				bT = this.twitterLoginEnabled()
			;

			return bF || bG || bT;
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/User/Login', 'View/App/Login', 'LoginViewModel'], LoginUserView);
	_.extend(LoginUserView.prototype, AbstractView.prototype);

	LoginUserView.prototype.displayMainForm = function ()
	{
		this.welcome(false);
	};

	LoginUserView.prototype.onShow = function ()
	{
		kn.routeOff();
	};

	LoginUserView.prototype.onShowWithDelay = function ()
	{
		if ('' !== this.email() && '' !== this.password())
		{
			this.submitFocus(true);
		}
		else if ('' === this.email())
		{
			this.emailFocus(true);
		}
		else if ('' === this.password())
		{
			this.passwordFocus(true);
		}
		else
		{
			this.emailFocus(true);
		}
	};

	LoginUserView.prototype.onHide = function ()
	{
		this.submitFocus(false);
		this.emailFocus(false);
		this.passwordFocus(false);
	};

	LoginUserView.prototype.onBuild = function ()
	{
		var
			self = this,
			sSignMeLocal = Local.get(Enums.ClientSideKeyName.LastSignMe),
			sSignMe = (Settings.settingsGet('SignMe') || 'unused').toLowerCase(),
			sJsHash = Settings.settingsGet('JsHash'),
			fSocial = function (iErrorCode) {
				iErrorCode = Utils.pInt(iErrorCode);
				if (0 === iErrorCode)
				{
					self.submitRequest(true);
					require('App/User').loginAndLogoutReload(false);
				}
				else
				{
					self.submitError(Translator.getNotification(iErrorCode));
				}
			}
		;

		this.facebookLoginEnabled(!!Settings.settingsGet('AllowFacebookSocial'));
		this.twitterLoginEnabled(!!Settings.settingsGet('AllowTwitterSocial'));
		this.googleLoginEnabled(!!Settings.settingsGet('AllowGoogleSocial') &&
			!!Settings.settingsGet('AllowGoogleSocialAuth'));
		this.googleFastLoginEnabled(!!Settings.settingsGet('AllowGoogleSocial') &&
			!!Settings.settingsGet('AllowGoogleSocialAuthFast'));

		switch (sSignMe)
		{
			case Enums.LoginSignMeTypeAsString.DefaultOff:
			case Enums.LoginSignMeTypeAsString.DefaultOn:

				this.signMeType(Enums.LoginSignMeTypeAsString.DefaultOn === sSignMe ?
					Enums.LoginSignMeType.DefaultOn : Enums.LoginSignMeType.DefaultOff);

				switch (sSignMeLocal)
				{
					case '-1-':
						this.signMeType(Enums.LoginSignMeType.DefaultOn);
						break;
					case '-0-':
						this.signMeType(Enums.LoginSignMeType.DefaultOff);
						break;
				}

				break;
			default:
			case Enums.LoginSignMeTypeAsString.Unused:
				this.signMeType(Enums.LoginSignMeType.Unused);
				break;
		}

		this.email(AppStore.devEmail);
		this.password(AppStore.devPassword);

		if (this.googleLoginEnabled() || this.googleFastLoginEnabled())
		{
			window['rl_' + sJsHash + '_google_login_service'] = fSocial;
		}

		if (this.facebookLoginEnabled())
		{
			window['rl_' + sJsHash + '_facebook_login_service'] = fSocial;
		}

		if (this.twitterLoginEnabled())
		{
			window['rl_' + sJsHash + '_twitter_login_service'] = fSocial;
		}

		_.delay(function () {
			LanguageStore.language.subscribe(function (sValue) {

				self.langRequest(true);

				Translator.reload(false, sValue, function() {
					self.langRequest(false);
					self.bSendLanguage = true;
				}, function() {
					self.langRequest(false);
				});

			});
		}, 50);

		Utils.triggerAutocompleteInputChange(true);
	};

	LoginUserView.prototype.submitForm = function ()
	{
		this.submitCommand();
	};

	LoginUserView.prototype.selectLanguage = function ()
	{
		kn.showScreenPopup(require('View/Popup/Languages'), [
			this.language, this.languages(), LanguageStore.userLanguage()
		]);
	};

	LoginUserView.prototype.selectLanguageOnTab = function (bShift)
	{
		if (!bShift)
		{
			var self = this;
			_.delay(function () {
				self.emailFocus(true);
			}, 5);

			return false;
		}

		return true;
	};

	module.exports = LoginUserView;

}());