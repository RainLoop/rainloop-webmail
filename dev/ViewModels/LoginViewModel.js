/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function LoginViewModel()
{
	KnoinAbstractViewModel.call(this, 'Center', 'Login');

	var oData = RL.data();

	this.email = ko.observable('');
	this.password = ko.observable('');
	this.signMe = ko.observable(false);

	this.additionalCode = ko.observable('');
	this.additionalCode.error = ko.observable(false);
	this.additionalCode.focused = ko.observable(false);
	this.additionalCode.visibility = ko.observable(false);
	this.additionalCodeSignMe = ko.observable(false);

	this.logoImg = Utils.trim(RL.settingsGet('LoginLogo'));
	this.loginDescription = Utils.trim(RL.settingsGet('LoginDescription'));
	this.logoCss = Utils.trim(RL.settingsGet('LoginCss'));

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

	this.allowLanguagesOnLogin = oData.allowLanguagesOnLogin;

	this.langRequest = ko.observable(false);
	this.mainLanguage = oData.mainLanguage;
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

				RL.remote().login(_.bind(function (sResult, oData) {

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
								RL.loginAndLogoutReload();
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

		if (!!RL.settingsGet('UseRsaEncryption'))
		{
			if (window.cryptico)
			{
				RL.remote().getPublicKey(function (sResult, oData) {

					var
						bRequest = false,
						oEncryptionResult = null
					;

					if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
					{
						oEncryptionResult = window.cryptico.encrypt(sPassword, oData.Result);
						if (oEncryptionResult && oEncryptionResult.cipher)
						{
							bRequest = false;
							fLoginRequest('cipher:' + oEncryptionResult.cipher);
						}
					}

					if (bRequest)
					{
						this.submitRequest(false);
						this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
					}
				});
			}
			else
			{
				this.submitRequest(false);
				this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
			}
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

		window.open(RL.link().socialFacebook(), 'Facebook', 'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
		return true;

	}, function () {
		return !this.submitRequest() && this.facebookLoginEnabled();
	});

	this.googleLoginEnabled = ko.observable(false);

	this.googleCommand = Utils.createCommand(this, function () {

		window.open(RL.link().socialGoogle(), 'Google', 'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
		return true;

	}, function () {
		return !this.submitRequest() && this.googleLoginEnabled();
	});
	
	this.twitterLoginEnabled = ko.observable(false);

	this.twitterCommand = Utils.createCommand(this, function () {

		window.open(RL.link().socialTwitter(), 'Twitter', 'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
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

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('LoginViewModel', LoginViewModel);

LoginViewModel.prototype.onShow = function ()
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

		if (RL.settingsGet('UserLanguage'))
		{
			$.cookie('rllang', RL.data().language(), {'expires': 30});
		}

	}, this), 100);
};

LoginViewModel.prototype.onHide = function ()
{
	this.submitFocus(false);
	this.emailFocus(false);
};

LoginViewModel.prototype.onBuild = function ()
{
	var
		self = this,
		sJsHash = RL.settingsGet('JsHash'),
		fSocial = function (iErrorCode) {
			iErrorCode = Utils.pInt(iErrorCode);
			if (0 === iErrorCode)
			{
				self.submitRequest(true);
				RL.loginAndLogoutReload();
			}
			else
			{
				self.submitError(Utils.getNotification(iErrorCode));
			}
		}
	;
	
	this.facebookLoginEnabled(!!RL.settingsGet('AllowFacebookSocial'));
	this.twitterLoginEnabled(!!RL.settingsGet('AllowTwitterSocial'));
	this.googleLoginEnabled(!!RL.settingsGet('AllowGoogleSocial'));

	switch ((RL.settingsGet('SignMe') || 'unused').toLowerCase())
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

	this.email(RL.data().devEmail);
	this.password(RL.data().devPassword);

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
		RL.data().language.subscribe(function (sValue) {
			self.langRequest(true);
			$.ajax({
				'url': RL.link().langLink(sValue),
				'dataType': 'script',
				'cache': true
			}).done(function() {
				self.bSendLanguage = true;
				Utils.i18nToDoc();
				$.cookie('rllang', RL.data().language(), {'expires': 30});
			}).always(function() {
				self.langRequest(false);
			});
		});
	}, 50);
};

LoginViewModel.prototype.selectLanguage = function ()
{
	kn.showScreenPopup(PopupsLanguagesViewModel);
};

