
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		Remote = require('Storage/User/Remote'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function AddAccountPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsAddAccount');

		this.email = ko.observable('');
		this.password = ko.observable('');

		this.emailError = ko.observable(false);
		this.passwordError = ko.observable(false);

		this.email.subscribe(function () {
			this.emailError(false);
		}, this);

		this.password.subscribe(function () {
			this.passwordError(false);
		}, this);

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');

		this.emailFocus = ko.observable(false);

		this.addAccountCommand = Utils.createCommand(this, function () {

			this.emailError('' === Utils.trim(this.email()));
			this.passwordError('' === Utils.trim(this.password()));

			if (this.emailError() || this.passwordError())
			{
				return false;
			}

			this.submitRequest(true);

			Remote.accountAdd(_.bind(function (sResult, oData) {

				this.submitRequest(false);
				if (Enums.StorageResultType.Success === sResult && oData && 'AccountAdd' === oData.Action)
				{
					if (oData.Result)
					{
						require('App/User').accountsAndIdentities();
						this.cancelCommand();
					}
					else if (oData.ErrorCode)
					{
						this.submitError(Utils.getNotification(oData.ErrorCode));
					}
				}
				else
				{
					this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
				}

			}, this), this.email(), '', this.password());

			return true;

		}, function () {
			return !this.submitRequest();
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/AddAccount', 'PopupsAddAccountViewModel'], AddAccountPopupView);
	_.extend(AddAccountPopupView.prototype, AbstractView.prototype);

	AddAccountPopupView.prototype.clearPopup = function ()
	{
		this.email('');
		this.password('');

		this.emailError(false);
		this.passwordError(false);

		this.submitRequest(false);
		this.submitError('');
	};

	AddAccountPopupView.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	AddAccountPopupView.prototype.onFocus = function ()
	{
		this.emailFocus(true);
	};

	module.exports = AddAccountPopupView;

}());