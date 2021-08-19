import ko from 'ko';

import { FilterAction } from 'Model/Filter';
import { FilterConditionField, FilterConditionType } from 'Model/FilterCondition';
import { defaultOptionsAfterRender } from 'Common/Utils';
import { i18n, initOnStartOrLangChange } from 'Common/Translator';

import { FolderUserStore } from 'Stores/User/Folder';
import { SieveUserStore } from 'Stores/User/Sieve';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { folderListOptionsBuilder } from 'Common/UtilsUser';

class FilterPopupView extends AbstractViewPopup {
	constructor() {
		super('Filter');

		this.addObservables({
			isNew: true,
			filter: null,
			allowMarkAsRead: false,
			selectedFolderValue: ''
		});

		this.fTrueCallback = null;

		this.defaultOptionsAfterRender = defaultOptionsAfterRender;
		this.folderSelectList = ko.computed(() =>
			folderListOptionsBuilder(
				[FolderUserStore.sieveAllowFileintoInbox ? '' : 'INBOX'],
				[['', '']],
				item => item ? item.localName() : ''
			)
		);


		this.selectedFolderValue.subscribe(() => this.filter() && this.filter().actionValueError(false));

		['actionTypeOptions','fieldOptions','typeOptions','typeOptionsSize','typeOptionsBody'].forEach(
			key => this[key] = ko.observableArray()
		);

		initOnStartOrLangChange(this.populateOptions.bind(this));

		SieveUserStore.capa.subscribe(this.populateOptions, this);

		decorateKoCommands(this, {
			saveFilterCommand: 1
		});
	}

	saveFilterCommand() {
		if (this.filter()) {
			if (FilterAction.MoveTo === this.filter().actionType()) {
				this.filter().actionValue(this.selectedFolderValue());
			}

			if (!this.filter().verify()) {
				return false;
			}

			this.fTrueCallback && this.fTrueCallback(this.filter());

			this.modalVisibility() && this.closeCommand();
		}

		return true;
	}

	populateOptions() {
		this.actionTypeOptions([]);

		let i18nFilter = key => i18n('POPUPS_FILTER/SELECT_' + key);

		this.fieldOptions([
			{ id: FilterConditionField.From, name: i18n('GLOBAL/FROM') },
			{ id: FilterConditionField.Recipient, name: i18nFilter('FIELD_RECIPIENTS') },
			{ id: FilterConditionField.Subject, name: i18n('GLOBAL/SUBJECT') },
			{ id: FilterConditionField.Size, name: i18nFilter('FIELD_SIZE') },
			{ id: FilterConditionField.Header, name: i18nFilter('FIELD_HEADER') }
		]);

		this.typeOptions([
			{ id: FilterConditionType.Contains, name: i18nFilter('TYPE_CONTAINS') },
			{ id: FilterConditionType.NotContains, name: i18nFilter('TYPE_NOT_CONTAINS') },
			{ id: FilterConditionType.EqualTo, name: i18nFilter('TYPE_EQUAL_TO') },
			{ id: FilterConditionType.NotEqualTo, name: i18nFilter('TYPE_NOT_EQUAL_TO') }
		]);

		// this.actionTypeOptions.push({id: FilterAction.None,
		// name: i18n('GLOBAL/NONE')});
		const modules = SieveUserStore.capa;
		if (modules) {
			if (modules.includes('imap4flags')) {
				this.allowMarkAsRead(true);
			}

			if (modules.includes('fileinto')) {
				this.actionTypeOptions.push({
					id: FilterAction.MoveTo,
					name: i18nFilter('ACTION_MOVE_TO')
				});
				this.actionTypeOptions.push({
					id: FilterAction.Forward,
					name: i18nFilter('ACTION_FORWARD_TO')
				});
			}

			if (modules.includes('reject')) {
				this.actionTypeOptions.push({ id: FilterAction.Reject, name: i18nFilter('ACTION_REJECT') });
			}

			if (modules.includes('vacation')) {
				this.actionTypeOptions.push({
					id: FilterAction.Vacation,
					name: i18nFilter('ACTION_VACATION_MESSAGE')
				});
			}

			if (modules.includes('body')) {
				this.fieldOptions.push({ id: FilterConditionField.Body, name: i18nFilter('FIELD_BODY') });
			}

			if (modules.includes('regex')) {
				this.typeOptions.push({ id: FilterConditionType.Regex, name: 'Regex' });
			}
		}

		this.actionTypeOptions.push({ id: FilterAction.Discard, name: i18nFilter('ACTION_DISCARD') });

		this.typeOptionsSize([
			{ id: FilterConditionType.Over, name: i18nFilter('TYPE_OVER') },
			{ id: FilterConditionType.Under, name: i18nFilter('TYPE_UNDER') }
		]);

		this.typeOptionsBody([
			{ id: FilterConditionType.Text, name: i18nFilter('TYPE_TEXT') },
			{ id: FilterConditionType.Raw, name: i18nFilter('TYPE_RAW') }
		]);
	}

	removeCondition(oConditionToDelete) {
		if (this.filter()) {
			this.filter().removeCondition(oConditionToDelete);
		}
	}

	clearPopup() {
		this.isNew(true);

		this.fTrueCallback = null;
		this.filter(null);
	}

	onShow(oFilter, fTrueCallback, bEdit) {
		this.clearPopup();

		this.fTrueCallback = fTrueCallback;
		this.filter(oFilter);

		if (oFilter) {
			this.selectedFolderValue(oFilter.actionValue());
		}

		this.isNew(!bEdit);

		if (!bEdit && oFilter) {
			oFilter.nameFocused(true);
		}
	}

	onShowWithDelay() {
		this.isNew() && this.filter() && this.filter().nameFocused(true);
	}
}

export { FilterPopupView, FilterPopupView as default };
