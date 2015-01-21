
(function () {

	'use strict';

	var
		ko = require('ko'),
		_ = require('_'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		Remote = require('Storage/User/Remote')
	;

	/**
	 * @constructor
	 */
	function FiltersUserSettings()
	{
		var self = this;

		this.haveChanges = ko.observable(false);

		this.processText = ko.observable('');
		this.visibility = ko.observable(false);

		this.filters = ko.observableArray([]);
		this.filters.loading = ko.observable(false).extend({'throttle': 200});
		this.filters.saving = ko.observable(false).extend({'throttle': 200});

		this.filters.subscribe(Utils.windowResizeCallback);

		this.processText = ko.computed(function () {
			return this.filters.loading() ? Utils.i18n('SETTINGS_FILTERS/LOADING_PROCESS') : '';
		}, this);

		this.visibility = ko.computed(function () {
			return '' === this.processText() ? 'hidden' : 'visible';
		}, this);

		this.filterForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend(
			{'toggleSubscribeProperty': [this, 'deleteAccess']});

		this.saveChanges = Utils.createCommand(this, function () {

			if (!this.filters.saving())
			{
				this.filters.saving(true);

				Remote.filtersSave(function (sResult, oData) {

					self.filters.saving(false);

					if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
					{
						self.haveChanges(false);
						self.updateList();
					}

				}, this.filters());
			}

			return true;

		}, function () {
			return this.haveChanges();
		});

		this.filters.subscribe(function () {
			this.haveChanges(true);
		}, this);
	}

	FiltersUserSettings.prototype.scrollableOptions = function ()
	{
		return {
			// handle: '.drag-handle'
		};
	};

	FiltersUserSettings.prototype.updateList = function ()
	{
		var
			self = this,
			FilterModel = require('Model/Filter')
		;

		this.filters.loading(true);

		Remote.filtersGet(function (sResult, oData) {

			self.filters.loading(false);

			if (Enums.StorageResultType.Success === sResult && oData &&
				oData.Result && Utils.isArray(oData.Result))
			{
				var aResult = _.compact(_.map(oData.Result, function (aItem) {
					var oNew = new FilterModel();
					return (oNew && oNew.parse(aItem)) ? oNew : null;
				}));

				self.filters(aResult);
			}
			else
			{
				self.filters([]);
			}

			self.haveChanges(false);
		});
	};

	FiltersUserSettings.prototype.deleteFilter = function (oFilter)
	{
		this.filters.remove(oFilter);
		Utils.delegateRunOnDestroy(oFilter);
	};

	FiltersUserSettings.prototype.addFilter = function ()
	{
		var
			self = this,
			FilterModel = require('Model/Filter'),
			oNew = new FilterModel()
		;

		oNew.generateID();
		require('Knoin/Knoin').showScreenPopup(
			require('View/Popup/Filter'), [oNew, function  () {
				self.filters.push(oNew);
				self.haveChanges(true);
			}, false]);
	};

	FiltersUserSettings.prototype.editFilter = function (oEdit)
	{
		var
			self = this,
			oCloned = oEdit.cloneSelf()
		;

		require('Knoin/Knoin').showScreenPopup(
			require('View/Popup/Filter'), [oCloned, function  () {

				var
					aFilters = self.filters(),
					iIndex = aFilters.indexOf(oEdit)
				;

				if (-1 < iIndex && aFilters[iIndex])
				{
					Utils.delegateRunOnDestroy(aFilters[iIndex]);
					aFilters[iIndex] = oCloned;

					self.filters(aFilters);
					self.haveChanges(true);
				}

			}, true]);
	};

	FiltersUserSettings.prototype.onBuild = function (oDom)
	{
		var self = this;

		oDom
			.on('click', '.filter-item .e-action', function () {
				var oFilterItem = ko.dataFor(this);
				if (oFilterItem)
				{
					self.editFilter(oFilterItem);
				}
			})
		;

		this.updateList();
	};

	module.exports = FiltersUserSettings;

}());