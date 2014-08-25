/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
'use strict';

(function (module) {

	var
		ko = require('../External/ko.js'),
		Utils = require('../Common/Utils.js')
	;

	/**
	 * @constructor
	 */
	function SettingsFilters()
	{
		this.filters = ko.observableArray([]);
		this.filters.loading = ko.observable(false);

		this.filters.subscribe(function () {
			Utils.windowResize();
		});
	}

	SettingsFilters.prototype.deleteFilter = function (oFilter)
	{
		this.filters.remove(oFilter);
	};

	SettingsFilters.prototype.addFilter = function ()
	{
		var
			kn = require('../Knoin/Knoin.js'),
			FilterModel = require('../Models/FilterModel.js'),
			PopupsFilterViewModel = require('../ViewModels/Popups/PopupsFilterViewModel.js')
		;

		kn.showScreenPopup(PopupsFilterViewModel, [new FilterModel()]);
	};

	module.exports = SettingsFilters;

}(module));