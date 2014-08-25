/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Remote = require('../Storages/AdminAjaxRemoteStorage.js'),

		kn = require('kn'),
		KnoinAbstractViewModel = require('KnoinAbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AdminLoginViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Center', 'AdminLogin');

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
						var RL = require('../Boots/AdminApp.js');
						RL.loginAndLogoutReload();
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

	kn.extendAsViewModel('AdminLoginViewModel', AdminLoginViewModel);

	AdminLoginViewModel.prototype.onShow = function ()
	{
		kn.routeOff();

		_.delay(_.bind(function () {
			this.loginFocus(true);
		}, this), 100);

	};

	AdminLoginViewModel.prototype.onHide = function ()
	{
		this.loginFocus(false);
	};

	AdminLoginViewModel.prototype.onBuild = function ()
	{
		Utils.triggerAutocompleteInputChange(true);
	};

	AdminLoginViewModel.prototype.submitForm = function ()
	{
		this.submitCommand();
	};

	module.exports = AdminLoginViewModel;

}(module, require));