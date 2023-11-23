import { FilterAction } from 'Sieve/Model/Filter';
import { FilterConditionField, FilterConditionType } from 'Sieve/Model/FilterCondition';
/*
import { SettingsUserStore } from 'Stores/User/Settings';
*/

import {
	capa,
	i18n,
	koComputable
} from 'Sieve/Utils';

const
	// import { defaultOptionsAfterRender } from 'Common/Utils';
	defaultOptionsAfterRender = (domItem, item) =>
		item && undefined !== item.disabled && domItem?.classList.toggle('disabled', domItem.disabled = item.disabled),

	// import { folderListOptionsBuilder } from 'Common/Folders';
	/**
	 * @returns {Array}
	 */
	folderListOptionsBuilder = () => {
		const
			aResult = [{
				id: '',
				name: '',
				system: false,
				disabled: false
			}],
			sDeepPrefix = '\u00A0\u00A0\u00A0',
			showUnsubscribed = true/*!SettingsUserStore.hideUnsubscribed()*/,

			disabled = rl.settings.get('sieveAllowFileintoInbox') ? '' : 'INBOX',

			foldersWalk = folders => {
				folders.forEach(oItem => {
					if (showUnsubscribed || oItem.hasSubscriptions() || !oItem.exists) {
						aResult.push({
							id: oItem.fullName,
							name: sDeepPrefix.repeat(oItem.deep) + oItem.detailedName(),
							system: false,
							disabled: !oItem.selectable() || disabled == oItem.fullName
						});
					}

					if (oItem.subFolders.length) {
						foldersWalk(oItem.subFolders());
					}
				});
			};


		// FolderUserStore.folderList()
		foldersWalk(window.Sieve.folderList() || []);

		return aResult;
	};

export class FilterPopupView extends rl.pluginPopupView {
	constructor() {
		super('Filter');

		this.addObservables({
			isNew: true,
			filter: null,
			allowMarkAsRead: false,
			selectedFolderValue: ''
		});

		this.defaultOptionsAfterRender = defaultOptionsAfterRender;
		this.folderSelectList = koComputable(() => folderListOptionsBuilder());

		this.selectedFolderValue.subscribe(() => this.filter().actionValueError(false));

		['actionTypeOptions','fieldOptions','typeOptions','typeOptionsSize','typeOptionsBody'].forEach(
			key => this[key] = ko.observableArray()
		);

		this.populateOptions();
	}

	saveFilter() {
		if (FilterAction.MoveTo === this.filter().actionType()) {
			this.filter().actionValue(this.selectedFolderValue());
		}

		if (this.filter().verify()) {
			this.fTrueCallback();
			this.close();
		}
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
		if (capa) {
			this.allowMarkAsRead(capa.includes('imap4flags'));

			if (capa.includes('fileinto')) {
				this.actionTypeOptions.push({
					id: FilterAction.MoveTo,
					name: i18nFilter('ACTION_MOVE_TO')
				});
			}

			// redirect command
			this.actionTypeOptions.push({
				id: FilterAction.Forward,
				name: i18nFilter('ACTION_FORWARD_TO')
			});

			if (capa.includes('reject')) {
				this.actionTypeOptions.push({ id: FilterAction.Reject, name: i18nFilter('ACTION_REJECT') });
			}

			if (capa.includes('vacation')) {
				this.actionTypeOptions.push({
					id: FilterAction.Vacation,
					name: i18nFilter('ACTION_VACATION_MESSAGE')
				});
			}

			if (capa.includes('body')) {
				this.fieldOptions.push({ id: FilterConditionField.Body, name: i18nFilter('FIELD_BODY') });
			}

			if (capa.includes('regex')) {
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
		this.filter().removeCondition(oConditionToDelete);
	}

	beforeShow(oFilter, fTrueCallback, bEdit) {
//	onShow(oFilter, fTrueCallback, bEdit) {
		this.populateOptions();

		this.isNew(!bEdit);

		this.fTrueCallback = fTrueCallback;
		this.filter(oFilter);

		this.selectedFolderValue(oFilter.actionValue());
	}
}
