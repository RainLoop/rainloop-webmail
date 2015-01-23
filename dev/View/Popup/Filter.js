
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
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

		this.isNew = ko.observable(true);

		this.fTrueCallback = null;
		this.filter = ko.observable(null);

		this.modules = Data.filterModules;
		this.allowMarkAsRead = ko.observable(false);

		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;
		this.folderSelectList = Data.folderMenuForFilters;
		this.selectedFolderValue = ko.observable('');

		this.selectedFolderValue.subscribe(function() {
			if (this.filter())
			{
				this.filter().actionValue.error(false);
			}
		}, this);

		this.saveFilter = Utils.createCommand(this, function () {

			if (this.filter())
			{
				if (Enums.FiltersAction.MoveTo === this.filter().actionType())
				{
					this.filter().actionValue(this.selectedFolderValue());
				}

				if (!this.filter().verify())
				{
					return false;
				}

				if (this.fTrueCallback)
				{
					this.fTrueCallback(this.filter());
				}

				if (this.modalVisibility())
				{
					Utils.delegateRun(this, 'closeCommand');
				}
			}

			return true;
		});

		this.actionTypeOptions = [];
		this.fieldOptions = [];
		this.typeOptions = [];

		this.populateOptions();

		this.modules.subscribe(this.populateOptions, this)

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Filter', 'PopupsFilterViewModel'], FilterPopupView);
	_.extend(FilterPopupView.prototype, AbstractView.prototype);

	FilterPopupView.prototype.populateOptions = function ()
	{
		this.actionTypeOptions = []
//		this.actionTypeOptions.push({'id': Enums.FiltersAction.None, 'name': 'None @i18n'});

		var oModules = this.modules();
		if (oModules)
		{
			if (oModules.markasread)
			{
				this.allowMarkAsRead(true);
			}

			if (oModules.moveto)
			{
				this.actionTypeOptions.push({'id': Enums.FiltersAction.MoveTo, 'name': 'Move to @i18n'});
			}

			if (oModules.redirect)
			{
				this.actionTypeOptions.push({'id': Enums.FiltersAction.Forward, 'name': 'Forward to @i18n'});
			}

			if (oModules.reject)
			{
				this.actionTypeOptions.push({'id': Enums.FiltersAction.Reject, 'name': 'Reject @i18n'});
			}

			if (oModules.vacation)
			{
				this.actionTypeOptions.push({'id': Enums.FiltersAction.Vacation, 'name': 'Vacation message @i18n'});
			}
		}

		this.actionTypeOptions.push({'id': Enums.FiltersAction.Discard, 'name': 'Discard @i18n'});

		this.fieldOptions = [
			{'id': Enums.FilterConditionField.From, 'name': 'From @i18n'},
			{'id': Enums.FilterConditionField.Recipient, 'name': 'Recipient (To or CC) @i18n'},
			{'id': Enums.FilterConditionField.Subject, 'name': 'Subject @i18n'}
		];

		this.typeOptions = [
			{'id': Enums.FilterConditionType.Contains, 'name': 'Contains @i18n'},
			{'id': Enums.FilterConditionType.NotContains, 'name': 'Not Contains @i18n'},
			{'id': Enums.FilterConditionType.EqualTo, 'name': 'Equal To @i18n'},
			{'id': Enums.FilterConditionType.NotEqualTo, 'name': 'Not Equal To @i18n'}
		];
	};


	FilterPopupView.prototype.removeCondition = function (oConditionToDelete)
	{
		if (this.filter())
		{
			this.filter().removeCondition(oConditionToDelete);
		}
	};

	FilterPopupView.prototype.clearPopup = function ()
	{
		this.isNew(true);

		this.fTrueCallback = null;
		this.filter(null);
	};

	FilterPopupView.prototype.onShow = function (oFilter, fTrueCallback, bEdit)
	{
		this.clearPopup();

		this.fTrueCallback = fTrueCallback;
		this.filter(oFilter);

		if (oFilter)
		{
			this.selectedFolderValue(oFilter.actionValue());
		}

		this.isNew(!bEdit);

		if (!bEdit && oFilter)
		{
			oFilter.name.focused(true);
		}
	};

	FilterPopupView.prototype.onFocus = function ()
	{
		if (this.isNew() &&  this.filter())
		{
			this.filter().name.focused(true);
		}
	};

	module.exports = FilterPopupView;

}());