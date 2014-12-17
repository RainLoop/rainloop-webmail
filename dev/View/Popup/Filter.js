
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Consts = require('Common/Consts'),
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

		this.selectedFolderValue = ko.observable(Consts.Values.UnuseOptionValue);
		this.folderSelectList = Data.folderMenuForMove;
		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

		this.saveFilter = Utils.createCommand(this, function () {

			if (this.filter())
			{
				if ('' === this.filter().name())
				{
					this.filter().name.error(true);
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

		this.actionTypeOptions = [
			{'id': Enums.FiltersAction.None, 'name': 'None @i18n'},
			{'id': Enums.FiltersAction.Move, 'name': ' Move to @i18n'},
//			{'id': Enums.FiltersAction.Forward, 'name': 'Forward to @i18n'},
			{'id': Enums.FiltersAction.Discard, 'name': 'Discard @i18n'}
		];

		this.fieldOptions = [
			{'id': Enums.FilterConditionField.From, 'name': 'From @i18n'},
			{'id': Enums.FilterConditionField.Recipient, 'name': 'Recipient (To or CC) @i18n'},
			{'id': Enums.FilterConditionField.Subject, 'name': 'Subject @i18n'}
		];

		this.typeOptions = [
			{'id': Enums.FilterConditionType.EqualTo, 'name': 'Equal To @i18n'},
			{'id': Enums.FilterConditionType.NotEqualTo, 'name': 'Not Equal To @i18n'},
			{'id': Enums.FilterConditionType.Contains, 'name': 'Contains @i18n'},
			{'id': Enums.FilterConditionType.NotContains, 'name': 'Not Contains @i18n'}
		];

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Filter', 'PopupsFilterViewModel'], FilterPopupView);
	_.extend(FilterPopupView.prototype, AbstractView.prototype);

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