
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),
		key = require('key'),

		Utils = require('Common/Utils'),
		Enums = require('Common/Enums'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function MessageOpenPgpPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsMessageOpenPgp');

		this.notification = ko.observable('');

		this.selectedKey = ko.observable(null);
		this.privateKeys = ko.observableArray([]);

		this.password = ko.observable('');
		this.password.focus = ko.observable(false);
		this.buttonFocus = ko.observable(false);

		this.resultCallback = null;

		this.submitRequest = ko.observable(false);

		// commands
		this.doCommand = Utils.createCommand(this, function () {

			this.submitRequest(true);

_.delay(_.bind(function() {

			var
				oPrivateKeys = [],
				oPrivateKey = null
			;

			try
			{
				if (this.resultCallback && this.selectedKey())
				{
					oPrivateKeys = this.selectedKey().getNativeKeys();
					oPrivateKey = oPrivateKeys && oPrivateKeys[0] ? oPrivateKeys[0] : null;

					if (oPrivateKey)
					{
						try
						{
							if (!oPrivateKey.decrypt(Utils.pString(this.password())))
							{
								oPrivateKey = null;
							}
						}
						catch (e)
						{
							oPrivateKey = null;
						}
					}
				}
			}
			catch (oExc)
			{
				oPrivateKey = null;
			}

			this.submitRequest(false);

			this.cancelCommand();
			this.resultCallback(oPrivateKey);

}, this), 100);

		}, function () {
			return !this.submitRequest();
		});

		this.sDefaultKeyScope = Enums.KeyState.PopupMessageOpenPGP;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/MessageOpenPgp'], MessageOpenPgpPopupView);
	_.extend(MessageOpenPgpPopupView.prototype, AbstractView.prototype);

	MessageOpenPgpPopupView.prototype.clearPopup = function ()
	{
		this.notification('');

		this.password('');
		this.password.focus(false);
		this.buttonFocus(false);

		this.selectedKey(false);
		this.submitRequest(false);

		this.resultCallback = null;
		this.privateKeys([]);
	};

	MessageOpenPgpPopupView.prototype.onBuild = function (oDom)
	{
		key('tab,shift+tab', Enums.KeyState.PopupMessageOpenPGP, _.bind(function () {

			switch (true)
			{
				case this.password.focus():
					this.buttonFocus(true);
					break;
				case this.buttonFocus():
					this.password.focus(true);
					break;
			}

			return false;

		}, this));

		var self = this;

		oDom
			.on('click', '.key-list__item', function () {

				oDom.find('.key-list__item .key-list__item__radio')
					.addClass('icon-radio-unchecked')
					.removeClass('icon-radio-checked')
				;

				$(this).find('.key-list__item__radio')
					.removeClass('icon-radio-unchecked')
					.addClass('icon-radio-checked')
				;

				self.selectedKey(ko.dataFor(this));

				self.password.focus(true);
			})
		;
	};

	MessageOpenPgpPopupView.prototype.onHideWithDelay = function ()
	{
		this.clearPopup();
	};

	MessageOpenPgpPopupView.prototype.onShowWithDelay = function ()
	{
		this.password.focus(true);
//		this.buttonFocus(true);
	};

	MessageOpenPgpPopupView.prototype.onShow = function (fCallback, aPrivateKeys)
	{
		this.clearPopup();

		this.resultCallback = fCallback;
		this.privateKeys(aPrivateKeys);

		if (this.viewModelDom)
		{
			this.viewModelDom.find('.key-list__item').first().click();
		}
	};

	module.exports = MessageOpenPgpPopupView;

}());