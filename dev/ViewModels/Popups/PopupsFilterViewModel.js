/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Consts = require('Consts'),
		Utils = require('Utils'),

		Data = require('../../Storages/WebMailDataStorage.js'),

		kn = require('kn'),
		KnoinAbstractViewModel = require('KnoinAbstractViewModel')
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

	kn.extendAsViewModel('PopupsFilterViewModel', PopupsFilterViewModel);

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

}(module, require));