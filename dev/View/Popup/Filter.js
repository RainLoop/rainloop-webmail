
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

		this.modules.subscribe(this.populateOptions, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Filter', 'PopupsFilterViewModel'], FilterPopupView);
	_.extend(FilterPopupView.prototype, AbstractView.prototype);

	FilterPopupView.prototype.populateOptions = function ()
	{
		this.actionTypeOptions = [];
//		this.actionTypeOptions.push({'id': Enums.FiltersAction.None,
//			'name': Utils.i18n('POPUPS_FILTER/SELECT_ACTION_NONE')});

		var oModules = this.modules();
		if (oModules)
		{
			if (oModules.markasread)
			{
				this.allowMarkAsRead(true);
			}

			if (oModules.moveto)
			{
				this.actionTypeOptions.push({'id': Enums.FiltersAction.MoveTo,
					'name': Utils.i18n('POPUPS_FILTER/SELECT_ACTION_MOVE_TO')});
			}

			if (oModules.redirect)
			{
				this.actionTypeOptions.push({'id': Enums.FiltersAction.Forward,
					'name': Utils.i18n('POPUPS_FILTER/SELECT_ACTION_FORWARD_TO')});
			}

			if (oModules.reject)
			{
				this.actionTypeOptions.push({'id': Enums.FiltersAction.Reject,
					'name': Utils.i18n('POPUPS_FILTER/SELECT_ACTION_REJECT')});
			}

			if (oModules.vacation)
			{
				this.actionTypeOptions.push({'id': Enums.FiltersAction.Vacation,
					'name': Utils.i18n('POPUPS_FILTER/SELECT_ACTION_VACATION_MESSAGE')});

			}
		}

		this.actionTypeOptions.push({'id': Enums.FiltersAction.Discard,
			'name': Utils.i18n('POPUPS_FILTER/SELECT_ACTION_DISCARD')});

		this.fieldOptions = [
			{'id': Enums.FilterConditionField.From, 'name': Utils.i18n('POPUPS_FILTER/SELECT_FIELD_FROM')},
			{'id': Enums.FilterConditionField.Recipient, 'name': Utils.i18n('POPUPS_FILTER/SELECT_FIELD_RECIPIENTS')},
			{'id': Enums.FilterConditionField.Subject, 'name': Utils.i18n('POPUPS_FILTER/SELECT_FIELD_SUBJECT')}
		];

		this.typeOptions = [
			{'id': Enums.FilterConditionType.Contains, 'name': Utils.i18n('POPUPS_FILTER/SELECT_TYPE_CONTAINS')},
			{'id': Enums.FilterConditionType.NotContains, 'name': Utils.i18n('POPUPS_FILTER/SELECT_TYPE_NOT_CONTAINS')},
			{'id': Enums.FilterConditionType.EqualTo, 'name': Utils.i18n('POPUPS_FILTER/SELECT_TYPE_EQUAL_TO')},
			{'id': Enums.FilterConditionType.NotEqualTo, 'name': Utils.i18n('POPUPS_FILTER/SELECT_TYPE_NOT_EQUAL_TO')}
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