
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
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
	function IdentityPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsIdentity');

		var self = this;

		this.id = '';
		this.edit = ko.observable(false);
		this.owner = ko.observable(false);

		this.email = ko.observable('').validateEmail();
		this.email.focused = ko.observable(false);
		this.name = ko.observable('');
		this.name.focused = ko.observable(false);
		this.replyTo = ko.observable('').validateSimpleEmail();
		this.replyTo.focused = ko.observable(false);
		this.bcc = ko.observable('').validateSimpleEmail();
		this.bcc.focused = ko.observable(false);

		this.signature = ko.observable('');
		this.signatureInsertBefore = ko.observable(false);

		this.showBcc = ko.observable(false);
		this.showReplyTo = ko.observable(false);

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');

		this.bcc.subscribe(function (aValue) {
			if (false === self.showBcc() && 0 < aValue.length)
			{
				self.showBcc(true);
			}
		}, this);

		this.replyTo.subscribe(function (aValue) {
			if (false === self.showReplyTo() && 0 < aValue.length)
			{
				self.showReplyTo(true);
			}
		}, this);

		this.addOrEditIdentityCommand = Utils.createCommand(this, function () {

			if (this.signature && this.signature.__fetchEditorValue)
			{
				this.signature.__fetchEditorValue();
			}

			if (!this.email.hasError())
			{
				this.email.hasError('' === Utils.trim(this.email()));
			}

			if (this.email.hasError())
			{
				if (!this.owner())
				{
					this.email.focused(true);
				}

				return false;
			}

			if (this.replyTo.hasError())
			{
				this.replyTo.focused(true);
				return false;
			}

			if (this.bcc.hasError())
			{
				this.bcc.focused(true);
				return false;
			}

			this.submitRequest(true);

			Remote.identityUpdate(_.bind(function (sResult, oData) {

				this.submitRequest(false);
				if (Enums.StorageResultType.Success === sResult && oData)
				{
					if (oData.Result)
					{
						require('App/User').accountsAndIdentities();
						this.cancelCommand();
					}
					else if (oData.ErrorCode)
					{
						this.submitError(Translator.getNotification(oData.ErrorCode));
					}
				}
				else
				{
					this.submitError(Translator.getNotification(Enums.Notification.UnknownError));
				}

			}, this), this.id, this.email(), this.name(), this.replyTo(), this.bcc(),
				this.signature(), this.signatureInsertBefore());

			return true;

		}, function () {
			return !this.submitRequest();
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Identity', 'PopupsIdentityViewModel'], IdentityPopupView);
	_.extend(IdentityPopupView.prototype, AbstractView.prototype);

	IdentityPopupView.prototype.clearPopup = function ()
	{
		this.id = '';
		this.edit(false);
		this.owner(false);

		this.name('');
		this.email('');
		this.replyTo('');
		this.bcc('');
		this.signature('');
		this.signatureInsertBefore(false);

		this.email.hasError(false);
		this.replyTo.hasError(false);
		this.bcc.hasError(false);

		this.showBcc(false);
		this.showReplyTo(false);

		this.submitRequest(false);
		this.submitError('');
	};

	/**
	 * @param {?IdentityModel} oIdentity
	 */
	IdentityPopupView.prototype.onShow = function (oIdentity)
	{
		this.clearPopup();

		if (oIdentity)
		{
			this.edit(true);

			this.id = oIdentity.id();
			this.name(oIdentity.name());
			this.email(oIdentity.email());
			this.replyTo(oIdentity.replyTo());
			this.bcc(oIdentity.bcc());
			this.signature(oIdentity.signature());
			this.signatureInsertBefore(oIdentity.signatureInsertBefore());

			this.owner(this.id === '');
		}
		else
		{
			this.id = Utils.fakeMd5();
		}
	};

	IdentityPopupView.prototype.onShowWithDelay = function ()
	{
		if (!this.owner() && !Globals.bMobile)
		{
			this.email.focused(true);
		}
	};

	IdentityPopupView.prototype.onHideWithDelay = function ()
	{
		this.clearPopup();
	};

	module.exports = IdentityPopupView;

}());