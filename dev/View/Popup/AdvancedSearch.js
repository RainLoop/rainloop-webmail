import _ from '_';
import ko from 'ko';

import { trim } from 'Common/Utils';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';
import { searchSubtractFormatDateHelper } from 'Common/Momentor';

import MessageStore from 'Stores/User/Message';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/AdvancedSearch',
	templateID: 'PopupsAdvancedSearch'
})
class AdvancedSearchPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.fromFocus = ko.observable(false);

		this.from = ko.observable('');
		this.to = ko.observable('');
		this.subject = ko.observable('');
		this.text = ko.observable('');
		this.selectedDateValue = ko.observable(-1);

		this.hasAttachment = ko.observable(false);
		this.starred = ko.observable(false);
		this.unseen = ko.observable(false);

		this.selectedDates = ko.computed(() => {
			translatorTrigger();
			return [
				{ id: -1, name: i18n('SEARCH/LABEL_ADV_DATE_ALL') },
				{ id: 3, name: i18n('SEARCH/LABEL_ADV_DATE_3_DAYS') },
				{ id: 7, name: i18n('SEARCH/LABEL_ADV_DATE_7_DAYS') },
				{ id: 30, name: i18n('SEARCH/LABEL_ADV_DATE_MONTH') },
				{ id: 90, name: i18n('SEARCH/LABEL_ADV_DATE_3_MONTHS') },
				{ id: 180, name: i18n('SEARCH/LABEL_ADV_DATE_6_MONTHS') },
				{ id: 365, name: i18n('SEARCH/LABEL_ADV_DATE_YEAR') }
			];
		});
	}

	@command()
	searchCommand() {
		const search = this.buildSearchString();
		if ('' !== search) {
			MessageStore.mainMessageListSearch(search);
		}

		this.cancelCommand();
	}

	parseSearchStringValue(search) {
		const parts = (search || '').split(/[\s]+/g);
		_.each(parts, (part) => {
			switch (part) {
				case 'has:attachment':
					this.hasAttachment(true);
					break;
				case 'is:unseen,flagged':
					this.starred(true);
				/* falls through */
				case 'is:unseen':
					this.unseen(true);
					break;
				// no default
			}
		});
	}

	buildSearchStringValue(value) {
		if (-1 < value.indexOf(' ')) {
			value = '"' + value + '"';
		}
		return value;
	}

	buildSearchString() {
		const result = [],
			from_ = trim(this.from()),
			to = trim(this.to()),
			subject = trim(this.subject()),
			text = trim(this.text()),
			isPart = [],
			hasPart = [];

		if (from_ && '' !== from_) {
			result.push('from:' + this.buildSearchStringValue(from_));
		}

		if (to && '' !== to) {
			result.push('to:' + this.buildSearchStringValue(to));
		}

		if (subject && '' !== subject) {
			result.push('subject:' + this.buildSearchStringValue(subject));
		}

		if (this.hasAttachment()) {
			hasPart.push('attachment');
		}

		if (this.unseen()) {
			isPart.push('unseen');
		}

		if (this.starred()) {
			isPart.push('flagged');
		}

		if (0 < hasPart.length) {
			result.push('has:' + hasPart.join(','));
		}

		if (0 < isPart.length) {
			result.push('is:' + isPart.join(','));
		}

		if (-1 < this.selectedDateValue()) {
			result.push('date:' + searchSubtractFormatDateHelper(this.selectedDateValue()) + '/');
		}

		if (text && '' !== text) {
			result.push('text:' + this.buildSearchStringValue(text));
		}

		return trim(result.join(' '));
	}

	clearPopup() {
		this.from('');
		this.to('');
		this.subject('');
		this.text('');

		this.selectedDateValue(-1);
		this.hasAttachment(false);
		this.starred(false);
		this.unseen(false);

		this.fromFocus(true);
	}

	onShow(search) {
		this.clearPopup();
		this.parseSearchStringValue(search);
	}

	onShowWithDelay() {
		this.fromFocus(true);
	}
}

export { AdvancedSearchPopupView, AdvancedSearchPopupView as default };
