
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Consts = require('Common/Consts'),
		Utils = require('Common/Utils'),

		Data = require('Storage:RainLoop:Data'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsFilterViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFilter');

		this.filter = ko.observable(null);

		this.selectedFolderValue = ko.observable(Consts.Values.UnuseOptionValue);
		this.folderSelectList = Data.folderMenuForMove;
		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:Filter', 'PopupsFilterViewModel'], PopupsFilterViewModel);
	_.extend(PopupsFilterViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsFilterViewModel.prototype.clearPopup = function ()
	{
		// TODO
	};

	PopupsFilterViewModel.prototype.onShow = function (oFilter)
	{
		this.clearPopup();

		this.filter(oFilter);
	};

	module.exports = PopupsFilterViewModel;

}());