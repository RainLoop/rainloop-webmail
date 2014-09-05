
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function ViewOpenPgpKeyPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsViewOpenPgpKey');

		this.key = ko.observable('');
		this.keyDom = ko.observable(null);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/ViewOpenPgpKey', 'PopupsViewOpenPgpKeyViewModel'], ViewOpenPgpKeyPopupView);
	_.extend(ViewOpenPgpKeyPopupView.prototype, AbstractView.prototype);

	ViewOpenPgpKeyPopupView.prototype.clearPopup = function ()
	{
		this.key('');
	};

	ViewOpenPgpKeyPopupView.prototype.selectKey = function ()
	{
		var oEl = this.keyDom();
		if (oEl)
		{
			Utils.selectElement(oEl);
		}
	};

	ViewOpenPgpKeyPopupView.prototype.onShow = function (oOpenPgpKey)
	{
		this.clearPopup();

		if (oOpenPgpKey)
		{
			this.key(oOpenPgpKey.armor);
		}
	};

	module.exports = ViewOpenPgpKeyPopupView;

}());