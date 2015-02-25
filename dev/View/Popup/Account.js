
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		Remote = require('Remote/User/Ajax'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function AccountPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsAccount');

		this.isNew = ko.observable(true);

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
		this.submitErrorAdditional = ko.observable('');

		this.emailFocus = ko.observable(false);

		this.addAccountCommand = Utils.createCommand(this, function () {

			this.emailError('' === Utils.trim(this.email()));
			this.passwordError('' === Utils.trim(this.password()));

			if (this.emailError() || this.passwordError())
			{
				return false;
			}

			this.submitRequest(true);

			Remote.accountSetup(_.bind(function (sResult, oData) {

				this.submitRequest(false);
				if (Enums.StorageResultType.Success === sResult && oData)
				{
					if (oData.Result)
					{
						require('App/User').accountsAndIdentities();
						this.cancelCommand();
					}
					else
					{
						this.submitError(oData.ErrorCode ? Translator.getNotification(oData.ErrorCode) :
							Translator.getNotification(Enums.Notification.UnknownError));

						if (oData.ErrorMessageAdditional)
						{
							this.submitErrorAdditional(oData.ErrorMessageAdditional);
						}
					}
				}
				else
				{
					this.submitError(Translator.getNotification(Enums.Notification.UnknownError));
					this.submitErrorAdditional('');
				}

			}, this), this.email(), this.password(), this.isNew());

			return true;

		}, function () {
			return !this.submitRequest();
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Account', 'View/Popup/AddAccount', 'PopupsAddAccountViewModel'], AccountPopupView);
	_.extend(AccountPopupView.prototype, AbstractView.prototype);

	AccountPopupView.prototype.clearPopup = function ()
	{
		this.isNew(true);

		this.email('');
		this.password('');

		this.emailError(false);
		this.passwordError(false);

		this.submitRequest(false);
		this.submitError('');
		this.submitErrorAdditional('');
	};

	AccountPopupView.prototype.onShow = function (oAccount)
	{
		this.clearPopup();
		if (oAccount && oAccount.canBeEdit())
		{
			this.isNew(false);
			this.email(oAccount.email);
		}
	};

	AccountPopupView.prototype.onShowWithDelay = function ()
	{
		this.emailFocus(true);
	};

	module.exports = AccountPopupView;

}());