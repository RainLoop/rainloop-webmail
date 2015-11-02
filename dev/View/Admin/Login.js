
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		Settings = require('Storage/Settings'),
		Remote = require('Remote/Admin/Ajax'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function LoginAdminView()
	{
		AbstractView.call(this, 'Center', 'AdminLogin');

		this.logoPowered = !!Settings.settingsGet('LoginPowered');

		this.login = ko.observable('');
		this.password = ko.observable('');

		this.loginError = ko.observable(false);
		this.passwordError = ko.observable(false);

		this.loginErrorAnimation = ko.observable(false).extend({'falseTimeout': 500});
		this.passwordErrorAnimation = ko.observable(false).extend({'falseTimeout': 500});

		this.loginFocus = ko.observable(false);

		this.formHidden = ko.observable(false);

		this.formError = ko.computed(function () {
			return this.loginErrorAnimation() || this.passwordErrorAnimation();
		}, this);

		this.login.subscribe(function () {
			this.loginError(false);
		}, this);

		this.password.subscribe(function () {
			this.passwordError(false);
		}, this);

		this.loginError.subscribe(function (bV) {
			this.loginErrorAnimation(!!bV);
		}, this);

		this.passwordError.subscribe(function (bV) {
			this.passwordErrorAnimation(!!bV);
		}, this);

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');

		this.submitCommand = Utils.createCommand(this, function () {

			Utils.triggerAutocompleteInputChange();

			this.loginError(false);
			this.passwordError(false);

			this.loginError('' === Utils.trim(this.login()));
			this.passwordError('' === Utils.trim(this.password()));

			if (this.loginError() || this.passwordError())
			{
				return false;
			}

			this.submitRequest(true);

			Remote.adminLogin(_.bind(function (sResult, oData) {

				if (Enums.StorageResultType.Success === sResult && oData && 'AdminLogin' === oData.Action)
				{
					if (oData.Result)
					{
						require('App/Admin').loginAndLogoutReload(true);
					}
					else if (oData.ErrorCode)
					{
						this.submitRequest(false);
						this.submitError(Translator.getNotification(oData.ErrorCode));
					}
				}
				else
				{
					this.submitRequest(false);
					this.submitError(Translator.getNotification(Enums.Notification.UnknownError));
				}

			}, this), this.login(), this.password());

			return true;

		}, function () {
			return !this.submitRequest();
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Admin/Login', 'AdminLoginViewModel'], LoginAdminView);
	_.extend(LoginAdminView.prototype, AbstractView.prototype);

	LoginAdminView.prototype.onShow = function ()
	{
		kn.routeOff();

		_.delay(_.bind(function () {
			this.loginFocus(true);
		}, this), 100);

	};

	LoginAdminView.prototype.onHide = function ()
	{
		this.loginFocus(false);
	};

	LoginAdminView.prototype.onBuild = function ()
	{
		Utils.triggerAutocompleteInputChange(true);
	};

	LoginAdminView.prototype.submitForm = function ()
	{
		this.submitCommand();
	};

	module.exports = LoginAdminView;

}());