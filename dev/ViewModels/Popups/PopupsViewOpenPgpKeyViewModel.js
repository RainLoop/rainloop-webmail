
(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Utils'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsViewOpenPgpKeyViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsViewOpenPgpKey');

		this.key = ko.observable('');
		this.keyDom = ko.observable(null);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:ViewOpenPgpKey', 'PopupsViewOpenPgpKeyViewModel'], PopupsViewOpenPgpKeyViewModel);
	_.extend(PopupsViewOpenPgpKeyViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsViewOpenPgpKeyViewModel.prototype.clearPopup = function ()
	{
		this.key('');
	};

	PopupsViewOpenPgpKeyViewModel.prototype.selectKey = function ()
	{
		var oEl = this.keyDom();
		if (oEl)
		{
			Utils.selectElement(oEl);
		}
	};

	PopupsViewOpenPgpKeyViewModel.prototype.onShow = function (oOpenPgpKey)
	{
		this.clearPopup();

		if (oOpenPgpKey)
		{
			this.key(oOpenPgpKey.armor);
		}
	};

	module.exports = PopupsViewOpenPgpKeyViewModel;

}(module, require));