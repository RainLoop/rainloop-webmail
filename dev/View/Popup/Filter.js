import _ from '_';
import ko from 'ko';

import { FiltersAction, FilterConditionField, FilterConditionType } from 'Common/Enums';
import { bMobileDevice } from 'Common/Globals';
import { defautOptionsAfterRender, delegateRun } from 'Common/Utils';
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

		this.isNew = ko.observable(true);

		this.modules = FilterStore.modules;

		this.fTrueCallback = null;
		this.filter = ko.observable(null);

		this.allowMarkAsRead = ko.observable(false);

		this.defautOptionsAfterRender = defautOptionsAfterRender;
		this.folderSelectList = FolderStore.folderMenuForFilters;
		this.selectedFolderValue = ko.observable('');

		this.selectedFolderValue.subscribe(() => {
			if (this.filter()) {
				this.filter().actionValue.error(false);
			}
		});

		this.actionTypeOptions = ko.observableArray([]);
		this.fieldOptions = ko.observableArray([]);
		this.typeOptions = ko.observableArray([]);
		this.typeOptionsSize = ko.observableArray([]);

		initOnStartOrLangChange(_.bind(this.populateOptions, this));

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

			if (this.fTrueCallback) {
				this.fTrueCallback(this.filter());
			}

			if (this.modalVisibility()) {
				delegateRun(this, 'closeCommand');
			}
		}

		return true;
	}

	populateOptions() {
		this.actionTypeOptions([]);

		// this.actionTypeOptions.push({'id': FiltersAction.None,
		// 'name': i18n('POPUPS_FILTER/SELECT_ACTION_NONE')});

		const modules = this.modules();
		if (modules) {
			if (modules.markasread) {
				this.allowMarkAsRead(true);
			}

			if (modules.moveto) {
				this.actionTypeOptions.push({
					'id': FiltersAction.MoveTo,
					'name': i18n('POPUPS_FILTER/SELECT_ACTION_MOVE_TO')
				});
			}

			if (modules.redirect) {
				this.actionTypeOptions.push({
					'id': FiltersAction.Forward,
					'name': i18n('POPUPS_FILTER/SELECT_ACTION_FORWARD_TO')
				});
			}

			if (modules.reject) {
				this.actionTypeOptions.push({ 'id': FiltersAction.Reject, 'name': i18n('POPUPS_FILTER/SELECT_ACTION_REJECT') });
			}

			if (modules.vacation) {
				this.actionTypeOptions.push({
					'id': FiltersAction.Vacation,
					'name': i18n('POPUPS_FILTER/SELECT_ACTION_VACATION_MESSAGE')
				});
			}
		}

		this.actionTypeOptions.push({ 'id': FiltersAction.Discard, 'name': i18n('POPUPS_FILTER/SELECT_ACTION_DISCARD') });

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

		if (modules && modules.regex) {
			this.typeOptions.push({ 'id': FilterConditionType.Regex, 'name': 'Regex' });
		}

		this.typeOptionsSize([
			{ 'id': FilterConditionType.Over, 'name': i18n('POPUPS_FILTER/SELECT_TYPE_OVER') },
			{ 'id': FilterConditionType.Under, 'name': i18n('POPUPS_FILTER/SELECT_TYPE_UNDER') }
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
			oFilter.name.focused(true);
		}
	}

	onShowWithDelay() {
		if (this.isNew() && this.filter() && !bMobileDevice) {
			this.filter().name.focused(true);
		}
	}
}

export { FilterPopupView, FilterPopupView as default };
