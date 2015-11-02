
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		MessageStore = require('Stores/User/Message'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function AdvancedSearchPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsAdvancedSearch');

		this.fromFocus = ko.observable(false);

		this.from = ko.observable('');
		this.to = ko.observable('');
		this.subject = ko.observable('');
		this.text = ko.observable('');
		this.selectedDateValue = ko.observable(-1);

		this.hasAttachment = ko.observable(false);
		this.starred = ko.observable(false);
		this.unseen = ko.observable(false);

		this.searchCommand = Utils.createCommand(this, function () {

			var sSearch = this.buildSearchString();
			if ('' !== sSearch)
			{
				MessageStore.mainMessageListSearch(sSearch);
			}

			this.cancelCommand();
		});

		this.selectedDates = ko.computed(function () {
			Translator.trigger();
			return [
				{'id': -1, 'name': Translator.i18n('SEARCH/LABEL_ADV_DATE_ALL')},
				{'id': 3, 'name': Translator.i18n('SEARCH/LABEL_ADV_DATE_3_DAYS')},
				{'id': 7, 'name': Translator.i18n('SEARCH/LABEL_ADV_DATE_7_DAYS')},
				{'id': 30, 'name': Translator.i18n('SEARCH/LABEL_ADV_DATE_MONTH')},
				{'id': 90, 'name': Translator.i18n('SEARCH/LABEL_ADV_DATE_3_MONTHS')},
				{'id': 180, 'name': Translator.i18n('SEARCH/LABEL_ADV_DATE_6_MONTHS')},
				{'id': 365, 'name': Translator.i18n('SEARCH/LABEL_ADV_DATE_YEAR')}
			];
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/AdvancedSearch', 'PopupsAdvancedSearchViewModel'], AdvancedSearchPopupView);
	_.extend(AdvancedSearchPopupView.prototype, AbstractView.prototype);

	AdvancedSearchPopupView.prototype.buildSearchStringValue = function (sValue)
	{
		if (-1 < sValue.indexOf(' '))
		{
			sValue = '"' + sValue + '"';
		}

		return sValue;
	};

	AdvancedSearchPopupView.prototype.buildSearchString = function ()
	{
		var
			aResult = [],
			sFrom = Utils.trim(this.from()),
			sTo = Utils.trim(this.to()),
			sSubject = Utils.trim(this.subject()),
			sText = Utils.trim(this.text()),
			aIs = [],
			aHas = []
		;

		if (sFrom && '' !== sFrom)
		{
			aResult.push('from:' + this.buildSearchStringValue(sFrom));
		}

		if (sTo && '' !== sTo)
		{
			aResult.push('to:' + this.buildSearchStringValue(sTo));
		}

		if (sSubject && '' !== sSubject)
		{
			aResult.push('subject:' + this.buildSearchStringValue(sSubject));
		}

		if (this.hasAttachment())
		{
			aHas.push('attachment');
		}

		if (this.unseen())
		{
			aIs.push('unseen');
		}

		if (this.starred())
		{
			aIs.push('flagged');
		}

		if (0 < aHas.length)
		{
			aResult.push('has:' + aHas.join(','));
		}

		if (0 < aIs.length)
		{
			aResult.push('is:' + aIs.join(','));
		}

		if (-1 < this.selectedDateValue())
		{
			aResult.push('date:' + require('Common/Momentor').searchSubtractFormatDateHelper(this.selectedDateValue()) + '/');
		}

		if (sText && '' !== sText)
		{
			aResult.push('text:' + this.buildSearchStringValue(sText));
		}

		return Utils.trim(aResult.join(' '));
	};

	AdvancedSearchPopupView.prototype.clearPopup = function ()
	{
		this.from('');
		this.to('');
		this.subject('');
		this.text('');

		this.selectedDateValue(-1);
		this.hasAttachment(false);
		this.starred(false);
		this.unseen(false);

		this.fromFocus(true);
	};

	AdvancedSearchPopupView.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	AdvancedSearchPopupView.prototype.onShowWithDelay = function ()
	{
		this.fromFocus(true);
	};

	module.exports = AdvancedSearchPopupView;

}());