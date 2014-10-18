
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Consts = require('Common/Consts'),
		Utils = require('Common/Utils'),

		Data = require('Storage/User/Data'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function FilterPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsFilter');

		this.filter = ko.observable(null);

		this.selectedFolderValue = ko.observable(Consts.Values.UnuseOptionValue);
		this.folderSelectList = Data.folderMenuForMove;
		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Filter', 'PopupsFilterViewModel'], FilterPopupView);
	_.extend(FilterPopupView.prototype, AbstractView.prototype);

	FilterPopupView.prototype.clearPopup = function ()
	{
		// TODO
	};

	FilterPopupView.prototype.onShow = function (oFilter)
	{
		this.clearPopup();

		this.filter(oFilter);
	};

	module.exports = FilterPopupView;

}());