import ko from 'ko';

import { FiltersAction, FilterConditionField, FilterConditionType } from 'Common/Enums';
import { defaultOptionsAfterRender } from 'Common/Utils';
import { i18n, initOnStartOrLangChange } from 'Common/Translator';

import FilterStore from 'Stores/User/Filter';
import FolderStore from 'Stores/User/Folder';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/Filter',
	templateID: 'PopupsFilter'
})
class FilterPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.addObservables({
			isNew: true,
			filter: null,
			allowMarkAsRead: false,
			selectedFolderValue: ''
		});

		this.modules = FilterStore.modules;

		this.fTrueCallback = null;

		this.defaultOptionsAfterRender = defaultOptionsAfterRender;
		this.folderSelectList = FolderStore.folderMenuForFilters;

		this.selectedFolderValue.subscribe(() => this.filter() && this.filter().actionValueError(false));

		this.actionTypeOptions = ko.observableArray([]);
		this.fieldOptions = ko.observableArray([]);
		this.typeOptions = ko.observableArray([]);
		this.typeOptionsSize = ko.observableArray([]);
		this.typeOptionsBody = ko.observableArray([]);

		initOnStartOrLangChange(this.populateOptions.bind(this));

		this.modules.subscribe(this.populateOptions, this);
	}

	@command()
	saveFilterCommand() {
		if (this.filter()) {
			if (FiltersAction.MoveTo === this.filter().actionType()) {
				this.filter().actionValue(this.selectedFolderValue());
			}

			if (!this.filter().verify()) {
				return false;
			}

			this.fTrueCallback && this.fTrueCallback(this.filter());

			this.modalVisibility() && this.closeCommand && this.closeCommand();
		}

		return true;
	}

	populateOptions() {
		this.actionTypeOptions([]);

		this.fieldOptions([
			{ 'id': FilterConditionField.From, 'name': i18n('POPUPS_FILTER/SELECT_FIELD_FROM') },
			{ 'id': FilterConditionField.Recipient, 'name': i18n('POPUPS_FILTER/SELECT_FIELD_RECIPIENTS') },
			{ 'id': FilterConditionField.Subject, 'name': i18n('POPUPS_FILTER/SELECT_FIELD_SUBJECT') },
			{ 'id': FilterConditionField.Size, 'name': i18n('POPUPS_FILTER/SELECT_FIELD_SIZE') },
			{ 'id': FilterConditionField.Header, 'name': i18n('POPUPS_FILTER/SELECT_FIELD_HEADER') }
		]);

		this.typeOptions([
			{ 'id': FilterConditionType.Contains, 'name': i18n('POPUPS_FILTER/SELECT_TYPE_CONTAINS') },
			{ 'id': FilterConditionType.NotContains, 'name': i18n('POPUPS_FILTER/SELECT_TYPE_NOT_CONTAINS') },
			{ 'id': FilterConditionType.EqualTo, 'name': i18n('POPUPS_FILTER/SELECT_TYPE_EQUAL_TO') },
			{ 'id': FilterConditionType.NotEqualTo, 'name': i18n('POPUPS_FILTER/SELECT_TYPE_NOT_EQUAL_TO') }
		]);

		// this.actionTypeOptions.push({'id': FiltersAction.None,
		// 'name': i18n('POPUPS_FILTER/SELECT_ACTION_NONE')});
		const modules = this.modules();
		if (modules) {
			if (modules.includes('imap4flags')) {
				this.allowMarkAsRead(true);
			}

			if (modules.includes('fileinto')) {
				this.actionTypeOptions.push({
					'id': FiltersAction.MoveTo,
					'name': i18n('POPUPS_FILTER/SELECT_ACTION_MOVE_TO')
				});
				this.actionTypeOptions.push({
					'id': FiltersAction.Forward,
					'name': i18n('POPUPS_FILTER/SELECT_ACTION_FORWARD_TO')
				});
			}

			if (modules.includes('reject')) {
				this.actionTypeOptions.push({ 'id': FiltersAction.Reject, 'name': i18n('POPUPS_FILTER/SELECT_ACTION_REJECT') });
			}

			if (modules.includes('vacation')) {
				this.actionTypeOptions.push({
					'id': FiltersAction.Vacation,
					'name': i18n('POPUPS_FILTER/SELECT_ACTION_VACATION_MESSAGE')
				});
			}

			if (modules.includes('body')) {
				this.fieldOptions.push({ 'id': FilterConditionField.Body, 'name': i18n('POPUPS_FILTER/SELECT_FIELD_BODY') });
			}

			if (modules.includes('regex')) {
				this.typeOptions.push({ 'id': FilterConditionType.Regex, 'name': 'Regex' });
			}
		}

		this.actionTypeOptions.push({ 'id': FiltersAction.Discard, 'name': i18n('POPUPS_FILTER/SELECT_ACTION_DISCARD') });

		this.typeOptionsSize([
			{ 'id': FilterConditionType.Over, 'name': i18n('POPUPS_FILTER/SELECT_TYPE_OVER') },
			{ 'id': FilterConditionType.Under, 'name': i18n('POPUPS_FILTER/SELECT_TYPE_UNDER') }
		]);

		this.typeOptionsBody([
			{ 'id': FilterConditionType.Text, 'name': i18n('POPUPS_FILTER/SELECT_TYPE_TEXT') },
			{ 'id': FilterConditionType.Raw, 'name': i18n('POPUPS_FILTER/SELECT_TYPE_RAW') }
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
		if (this.isNew() && this.filter()/* && !rl.settings.app('mobile')*/) {
			this.filter().nameFocused(true);
		}
	}
}

export { FilterPopupView, FilterPopupView as default };
