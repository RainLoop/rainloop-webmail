
(function () {

	'use strict';

	var
		ko = require('ko'),
		_ = require('_'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		FilterStore = require('Stores/User/Filter'),

		Remote = require('Remote/User/Ajax')
	;

	/**
	 * @constructor
	 */
	function FiltersUserSettings()
	{
		var self = this;

		this.modules = FilterStore.modules;
		this.filters = FilterStore.filters;

		this.inited = ko.observable(false);
		this.serverError = ko.observable(false);
		this.serverErrorDesc = ko.observable('');
		this.haveChanges = ko.observable(false);

		this.saveErrorText = ko.observable('');

		this.filters.subscribe(Utils.windowResizeCallback);

		this.serverError.subscribe(function (bValue) {
			if (!bValue)
			{
				this.serverErrorDesc('');
			}
		}, this);

		this.filterRaw = FilterStore.raw;
		this.filterRaw.capa = FilterStore.capa;
		this.filterRaw.active = ko.observable(false);
		this.filterRaw.allow = ko.observable(false);
		this.filterRaw.error = ko.observable(false);

		this.filterForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend(
			{'toggleSubscribeProperty': [this, 'deleteAccess']});

		this.saveChanges = Utils.createCommand(this, function () {

			if (!this.filters.saving())
			{
				if (this.filterRaw.active() && '' === Utils.trim(this.filterRaw()))
				{
					this.filterRaw.error(true);
					return false;
				}

				this.filters.saving(true);
				this.saveErrorText('');

				Remote.filtersSave(function (sResult, oData) {

					self.filters.saving(false);

					if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
					{
						self.haveChanges(false);
						self.updateList();
					}
					else if (oData && oData.ErrorCode)
					{
						self.saveErrorText(oData.ErrorMessageAdditional || Translator.getNotification(oData.ErrorCode));
					}
					else
					{
						self.saveErrorText(Translator.getNotification(Enums.Notification.CantSaveFilters));
					}

				}, this.filters(), this.filterRaw(), this.filterRaw.active());
			}

			return true;

		}, function () {
			return this.haveChanges();
		});

		this.filters.subscribe(function () {
			this.haveChanges(true);
		}, this);

		this.filterRaw.subscribe(function () {
			this.haveChanges(true);
			this.filterRaw.error(false);
		}, this);

		this.haveChanges.subscribe(function () {
			this.saveErrorText('');
		}, this);

		this.filterRaw.active.subscribe(function () {
			this.haveChanges(true);
			this.filterRaw.error(false);
		}, this);
	}

	FiltersUserSettings.prototype.scrollableOptions = function (sWrapper)
	{
		return {
			handle: '.drag-handle',
			containment: sWrapper || 'parent',
			axis: 'y'
		};
	};

	FiltersUserSettings.prototype.updateList = function ()
	{
		var
			self = this,
			FilterModel = require('Model/Filter')
		;

		if (!this.filters.loading())
		{
			this.filters.loading(true);

			Remote.filtersGet(function (sResult, oData) {

				self.filters.loading(false);
				self.serverError(false);

				if (Enums.StorageResultType.Success === sResult && oData &&
					oData.Result && Utils.isArray(oData.Result.Filters))
				{
					self.inited(true);
					self.serverError(false);

					var aResult = _.compact(_.map(oData.Result.Filters, function (aItem) {
						var oNew = new FilterModel();
						return (oNew && oNew.parse(aItem)) ? oNew : null;
					}));

					self.filters(aResult);

					self.modules(oData.Result.Modules ? oData.Result.Modules : {});

					self.filterRaw(oData.Result.Raw || '');
					self.filterRaw.capa(Utils.isArray(oData.Result.Capa) ? oData.Result.Capa.join(' ') : '');
					self.filterRaw.active(!!oData.Result.RawIsActive);
					self.filterRaw.allow(!!oData.Result.RawIsAllow);
				}
				else
				{
					self.filters([]);
					self.modules({});
					self.filterRaw('');
					self.filterRaw.capa({});

					self.serverError(true);
					self.serverErrorDesc(oData && oData.ErrorCode ? Translator.getNotification(oData.ErrorCode) :
						Translator.getNotification(Enums.Notification.CantGetFilters));
				}

				self.haveChanges(false);
			});
		}
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
				self.filterRaw.active(false);
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
	};

	FiltersUserSettings.prototype.onShow = function ()
	{
		this.updateList();
	};

	module.exports = FiltersUserSettings;

}());