/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../../External/ko.js'),
		Utils = require('../../Common/Utils.js'),
		kn = require('../../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../../Knoin/KnoinAbstractViewModel.js')
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

	kn.extendAsViewModel('PopupsViewOpenPgpKeyViewModel', PopupsViewOpenPgpKeyViewModel);

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

}(module));