
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),
		HtmlEditor = require('Common/HtmlEditor'),

		Remote = require('Storage/User/Remote'),

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

		this.id = '';
		this.edit = ko.observable(false);
		this.owner = ko.observable(false);

		this.editor = null;
		this.signatureDom = ko.observable(null);

		this.email = ko.observable('').validateEmail();
		this.email.focused = ko.observable(false);
		this.name = ko.observable('');
		this.name.focused = ko.observable(false);
		this.replyTo = ko.observable('').validateSimpleEmail();
		this.replyTo.focused = ko.observable(false);
		this.bcc = ko.observable('').validateSimpleEmail();
		this.bcc.focused = ko.observable(false);

		this.signature = ko.observable('');

	//	this.email.subscribe(function () {
	//		this.email.hasError(false);
	//	}, this);

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');

		this.addOrEditIdentityCommand = Utils.createCommand(this, function () {

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

			}, this), this.id, this.email(), this.name(), this.replyTo(), this.bcc());

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

		this.email.hasError(false);
		this.replyTo.hasError(false);
		this.bcc.hasError(false);

		this.submitRequest(false);
		this.submitError('');

		if (this.editor)
		{
			this.editor.clear(false);
		}
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

			this.owner(this.id === '');
		}
		else
		{
			this.id = Utils.fakeMd5();
		}
	};

	IdentityPopupView.prototype.onHide = function ()
	{
		this.clearPopup();
	};

	IdentityPopupView.prototype.setSignature = function (sSignature)
	{
		if (this.editor)
		{
			if (':HTML:' === sSignature.substr(0, 6))
			{
				this.editor.setHtml(sSignature.substr(6), false);
			}
			else
			{
				this.editor.setPlain(sSignature, false);
			}
		}
	};

	IdentityPopupView.prototype.onFocus = function ()
	{
		if (!this.editor && this.signatureDom())
		{
			var self = this;
			this.editor = new HtmlEditor(self.signatureDom(), function () {
				self.signature(
					(self.editor.isHtml() ? ':HTML:' : '') + self.editor.getData()
				);
			}, function () {
				self.setSignature(self.signature());
			});
		}
		else
		{
			this.setSignature(this.signature());
		}

		if (!this.owner())
		{
			this.email.focused(true);
		}
	};

	module.exports = IdentityPopupView;

}());