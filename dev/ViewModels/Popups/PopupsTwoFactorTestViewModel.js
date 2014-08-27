/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Remote = require('Storage:RainLoop:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsTwoFactorTestViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsTwoFactorTest');

		var self = this;

		this.code = ko.observable('');
		this.code.focused = ko.observable(false);
		this.code.status = ko.observable(null);

		this.testing = ko.observable(false);

		// commands
		this.testCode = Utils.createCommand(this, function () {

			this.testing(true);
			Remote.testTwoFactor(function (sResult, oData) {

				self.testing(false);
				self.code.status(Enums.StorageResultType.Success === sResult && oData && oData.Result ? true : false);

			}, this.code());

		}, function () {
			return '' !== this.code() && !this.testing();
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsTwoFactorTestViewModel', PopupsTwoFactorTestViewModel);

	PopupsTwoFactorTestViewModel.prototype.clearPopup = function ()
	{
		this.code('');
		this.code.focused(false);
		this.code.status(null);
		this.testing(false);
	};

	PopupsTwoFactorTestViewModel.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	PopupsTwoFactorTestViewModel.prototype.onFocus = function ()
	{
		this.code.focused(true);
	};

	module.exports = PopupsTwoFactorTestViewModel;

}(module, require));