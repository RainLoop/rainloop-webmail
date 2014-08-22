/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../External/ko.js'),
		Utils = require('../Common/Utils.js'),
		kn = require('../Knoin/Knoin.js'),
		PopupsFilterViewModel = require('../ViewModels/Popups/PopupsFilterViewModel.js')
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
		kn.showScreenPopup(PopupsFilterViewModel, [new FilterModel()]);
	};

	module.exports = SettingsFilters;

}(module));