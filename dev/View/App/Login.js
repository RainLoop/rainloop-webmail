
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		LinkBuilder = require('Common/LinkBuilder'),

		Settings = require('Storage/Settings'),
		Data = require('Storage/App/Data'),
		Remote = require('Storage/App/Remote'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function LoginAppView()
	{
		AbstractView.call(this, 'Center', 'Login');

		this.email = ko.observable('');
		this.password = ko.observable('');
		this.signMe = ko.observable(false);

		this.additionalCode = ko.observable('');
		this.additionalCode.error = ko.observable(false);
		this.additionalCode.focused = ko.observable(false);
		this.additionalCode.visibility = ko.observable(false);
		this.additionalCodeSignMe = ko.observable(false);

		this.logoImg = Utils.trim(Settings.settingsGet('LoginLogo'));
		this.loginDescription = Utils.trim(Settings.settingsGet('LoginDescription'));
		this.logoCss = Utils.trim(Settings.settingsGet('LoginCss'));

		this.emailError = ko.observable(false);
		this.passwordError = ko.observable(false);

		this.emailFocus = ko.observable(false);
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

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');

		this.allowLanguagesOnLogin = Data.allowLanguagesOnLogin;

		this.langRequest = ko.observable(false);
		this.mainLanguage = Data.mainLanguage;
		this.bSendLanguage = false;

		this.mainLanguageFullName = ko.computed(function () {
			return Utils.convertLangName(this.mainLanguage());
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

			this.emailError('' === Utils.trim(this.email()));
			this.passwordError('' === Utils.trim(this.password()));

			if (this.additionalCode.visibility())
			{
				this.additionalCode.error('' === Utils.trim(this.additionalCode()));
			}

			if (this.emailError() || this.passwordError() || this.additionalCode.error())
			{
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
								else
								{
									require('App/App').loginAndLogoutReload();
								}
							}
							else if (oData.ErrorCode)
							{
								this.submitRequest(false);
								this.submitError(Utils.getNotification(oData.ErrorCode));

								if ('' === this.submitError())
								{
									this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
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
							this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
						}

					}, this), this.email(), '', sPassword, !!this.signMe(),
						this.bSendLanguage ? this.mainLanguage() : '',
						this.additionalCode.visibility() ? this.additionalCode() : '',
						this.additionalCode.visibility() ? !!this.additionalCodeSignMe() : false
					);

				}, this)
			;

			if (!!Settings.settingsGet('UseRsaEncryption') && Utils.rsaEncode.supported)
			{
				Remote.getPublicKey(_.bind(function (sResult, oData) {

					var bRequest = false;
					if (Enums.StorageResultType.Success === sResult && oData && oData.Result &&
						Utils.isArray(oData.Result) && oData.Result[0] && oData.Result[1] && oData.Result[2])
					{
						var sEncryptedPassword = Utils.rsaEncode(sPassword, oData.Result[0], oData.Result[1], oData.Result[2]);
						if (sEncryptedPassword)
						{
							fLoginRequest(sEncryptedPassword);
							bRequest = true;
						}
					}

					if (!bRequest)
					{
						this.submitRequest(false);
						this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
					}

				}, this));
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

			window.open(LinkBuilder.socialFacebook(), 'Facebook',
				'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
			return true;

		}, function () {
			return !this.submitRequest() && this.facebookLoginEnabled();
		});

		this.googleLoginEnabled = ko.observable(false);

		this.googleCommand = Utils.createCommand(this, function () {

			window.open(LinkBuilder.socialGoogle(), 'Google',
				'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
			return true;

		}, function () {
			return !this.submitRequest() && this.googleLoginEnabled();
		});

		this.twitterLoginEnabled = ko.observable(false);

		this.twitterCommand = Utils.createCommand(this, function () {

			window.open(LinkBuilder.socialTwitter(), 'Twitter',
				'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');

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

	kn.extendAsViewModel(['View/App/Login', 'LoginViewModel'], LoginAppView);
	_.extend(LoginAppView.prototype, AbstractView.prototype);

	LoginAppView.prototype.onShow = function ()
	{
		kn.routeOff();

		_.delay(_.bind(function () {
			if ('' !== this.email() && '' !== this.password())
			{
				this.submitFocus(true);
			}
			else
			{
				this.emailFocus(true);
			}

			if (Settings.settingsGet('UserLanguage'))
			{
				$.cookie('rllang', Data.language(), {'expires': 30});
			}

		}, this), 100);
	};

	LoginAppView.prototype.onHide = function ()
	{
		this.submitFocus(false);
		this.emailFocus(false);
	};

	LoginAppView.prototype.onBuild = function ()
	{
		var
			self = this,
			sJsHash = Settings.settingsGet('JsHash'),
			fSocial = function (iErrorCode) {
				iErrorCode = Utils.pInt(iErrorCode);
				if (0 === iErrorCode)
				{
					self.submitRequest(true);
					require('App/App').loginAndLogoutReload();
				}
				else
				{
					self.submitError(Utils.getNotification(iErrorCode));
				}
			}
		;

		this.facebookLoginEnabled(!!Settings.settingsGet('AllowFacebookSocial'));
		this.twitterLoginEnabled(!!Settings.settingsGet('AllowTwitterSocial'));
		this.googleLoginEnabled(!!Settings.settingsGet('AllowGoogleSocial'));

		switch ((Settings.settingsGet('SignMe') || 'unused').toLowerCase())
		{
			case Enums.LoginSignMeTypeAsString.DefaultOff:
				this.signMeType(Enums.LoginSignMeType.DefaultOff);
				break;
			case Enums.LoginSignMeTypeAsString.DefaultOn:
				this.signMeType(Enums.LoginSignMeType.DefaultOn);
				break;
			default:
			case Enums.LoginSignMeTypeAsString.Unused:
				this.signMeType(Enums.LoginSignMeType.Unused);
				break;
		}

		this.email(Data.devEmail);
		this.password(Data.devPassword);

		if (this.googleLoginEnabled())
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
			Data.language.subscribe(function (sValue) {

				self.langRequest(true);

				Utils.reloadLanguage(sValue, function() {
					self.bSendLanguage = true;
					$.cookie('rllang', sValue, {'expires': 30});
				}, null, function() {
					self.langRequest(false);
				});

			});
		}, 50);

		Utils.triggerAutocompleteInputChange(true);
	};

	LoginAppView.prototype.submitForm = function ()
	{
		this.submitCommand();
	};

	LoginAppView.prototype.selectLanguage = function ()
	{
		kn.showScreenPopup(require('View/Popup/Languages'));
	};

	module.exports = LoginAppView;

}());