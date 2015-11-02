
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		FilterStore = require('Stores/User/Filter'),
		FolderStore = require('Stores/User/Folder'),

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

		this.modules = FilterStore.modules;

		this.fTrueCallback = null;
		this.filter = ko.observable(null);

		this.allowMarkAsRead = ko.observable(false);

		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;
		this.folderSelectList = FolderStore.folderMenuForFilters;
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

		this.actionTypeOptions = ko.observableArray([]);
		this.fieldOptions = ko.observableArray([]);
		this.typeOptions = ko.observableArray([]);
		this.typeOptionsSize = ko.observableArray([]);

		Translator.initOnStartOrLangChange(this.populateOptions, this);

		this.modules.subscribe(this.populateOptions, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Filter', 'PopupsFilterViewModel'], FilterPopupView);
	_.extend(FilterPopupView.prototype, AbstractView.prototype);

	FilterPopupView.prototype.populateOptions = function ()
	{
		this.actionTypeOptions([]);

//		this.actionTypeOptions.push({'id': Enums.FiltersAction.None,
//			'name': Translator.i18n('POPUPS_FILTER/SELECT_ACTION_NONE')});

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
					'name': Translator.i18n('POPUPS_FILTER/SELECT_ACTION_MOVE_TO')});
			}

			if (oModules.redirect)
			{
				this.actionTypeOptions.push({'id': Enums.FiltersAction.Forward,
					'name': Translator.i18n('POPUPS_FILTER/SELECT_ACTION_FORWARD_TO')});
			}

			if (oModules.reject)
			{
				this.actionTypeOptions.push({'id': Enums.FiltersAction.Reject,
					'name': Translator.i18n('POPUPS_FILTER/SELECT_ACTION_REJECT')});
			}

			if (oModules.vacation)
			{
				this.actionTypeOptions.push({'id': Enums.FiltersAction.Vacation,
					'name': Translator.i18n('POPUPS_FILTER/SELECT_ACTION_VACATION_MESSAGE')});

			}
		}

		this.actionTypeOptions.push({'id': Enums.FiltersAction.Discard,
			'name': Translator.i18n('POPUPS_FILTER/SELECT_ACTION_DISCARD')});

		this.fieldOptions([
			{'id': Enums.FilterConditionField.From, 'name': Translator.i18n('POPUPS_FILTER/SELECT_FIELD_FROM')},
			{'id': Enums.FilterConditionField.Recipient, 'name': Translator.i18n('POPUPS_FILTER/SELECT_FIELD_RECIPIENTS')},
			{'id': Enums.FilterConditionField.Subject, 'name': Translator.i18n('POPUPS_FILTER/SELECT_FIELD_SUBJECT')},
			{'id': Enums.FilterConditionField.Size, 'name': Translator.i18n('POPUPS_FILTER/SELECT_FIELD_SIZE')},
			{'id': Enums.FilterConditionField.Header, 'name': Translator.i18n('POPUPS_FILTER/SELECT_FIELD_HEADER')}
		]);

		this.typeOptions([
			{'id': Enums.FilterConditionType.Contains, 'name': Translator.i18n('POPUPS_FILTER/SELECT_TYPE_CONTAINS')},
			{'id': Enums.FilterConditionType.NotContains, 'name': Translator.i18n('POPUPS_FILTER/SELECT_TYPE_NOT_CONTAINS')},
			{'id': Enums.FilterConditionType.EqualTo, 'name': Translator.i18n('POPUPS_FILTER/SELECT_TYPE_EQUAL_TO')},
			{'id': Enums.FilterConditionType.NotEqualTo, 'name': Translator.i18n('POPUPS_FILTER/SELECT_TYPE_NOT_EQUAL_TO')}
		]);

		this.typeOptionsSize([
			{'id': Enums.FilterConditionType.Over, 'name': Translator.i18n('POPUPS_FILTER/SELECT_TYPE_OVER')},
			{'id': Enums.FilterConditionType.Under, 'name': Translator.i18n('POPUPS_FILTER/SELECT_TYPE_UNDER')}
		]);
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

	FilterPopupView.prototype.onShowWithDelay = function ()
	{
		if (this.isNew() && this.filter() && !Globals.bMobile)
		{
			this.filter().name.focused(true);
		}
	};

	module.exports = FilterPopupView;

}());