
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		Settings = require('Storage/Settings'),
		Remote = require('Storage/Admin/Remote'),

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

		this.loginFocus = ko.observable(false);

		this.login.subscribe(function () {
			this.loginError(false);
		}, this);

		this.password.subscribe(function () {
			this.passwordError(false);
		}, this);

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');

		this.submitCommand = Utils.createCommand(this, function () {

			Utils.triggerAutocompleteInputChange();

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
						require('App/Admin').loginAndLogoutReload();
					}
					else if (oData.ErrorCode)
					{
						this.submitRequest(false);
						this.submitError(Utils.getNotification(oData.ErrorCode));
					}
				}
				else
				{
					this.submitRequest(false);
					this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
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