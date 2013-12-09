/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function LoginViewModel()
{
	KnoinAbstractViewModel.call(this, 'Right', 'Login');

	var oData = RL.data();

	this.email = ko.observable('');
	this.login = ko.observable('');
	this.password = ko.observable('');
	this.signMe = ko.observable(false);

	this.logoMain = ko.observable('RainLoop');

	this.emailError = ko.observable(false);
	this.loginError = ko.observable(false);
	this.passwordError = ko.observable(false);

	this.emailFocus = ko.observable(false);
	this.loginFocus = ko.observable(false);
	this.submitFocus = ko.observable(false);

	this.email.subscribe(function () {
		this.emailError(false);
	}, this);

	this.login.subscribe(function () {
		this.loginError(false);
	}, this);

	this.password.subscribe(function () {
		this.passwordError(false);
	}, this);

	this.submitRequest = ko.observable(false);
	this.submitError = ko.observable('');

	this.allowCustomLogin = oData.allowCustomLogin;
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

		if (this.emailError() || this.passwordError())
		{
			return false;
		}

		this.submitRequest(true);

		RL.remote().login(_.bind(function (sResult, oData) {

			if (Enums.StorageResultType.Success === sResult && oData && 'Login' === oData.Action)
			{
				if (oData.Result)
				{
					RL.loginAndLogoutReload();
				}
				else if (oData.ErrorCode)
				{
					this.submitRequest(false);
					this.submitError(Utils.getNotification(oData.ErrorCode));
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

		}, this), this.email(), this.login(), this.password(), !!this.signMe(),
			this.bSendLanguage ? this.mainLanguage() : '');

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

	this.loginFocus.subscribe(function (bValue) {
		if (bValue && '' === this.login() && '' !== this.email())
		{
			this.login(this.email());
		}
	}, this);

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
	this.login(RL.data().devLogin);
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

