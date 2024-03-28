import { addObservablesTo, addComputablesTo } from 'External/ko';
import { i18n, translateTrigger } from 'Common/Translator';
import { pString } from 'Common/Utils';

import { MessagelistUserStore } from 'Stores/User/Messagelist';

import { AbstractViewPopup } from 'Knoin/AbstractViews';
import { FolderUserStore, isAllowedKeyword } from 'Stores/User/Folder';

export class AdvancedSearchPopupView extends AbstractViewPopup {
	constructor() {
		super('AdvancedSearch');

		addObservablesTo(this, {
			from: '',
			to: '',
			subject: '',
			text: '',
			keyword: '',
			repliedValue: -1,
			selectedDateValue: -1,
			selectedTreeValue: '',

			hasAttachment: false,
			starred: false,
			unseen: false
		});

		addComputablesTo(this, {
			showMultisearch: () => FolderUserStore.hasCapability('MULTISEARCH'),

			// Almost the same as MessageModel.tagOptions
			keywords: () => {
				const keywords = [{value:'',label:''}];
				FolderUserStore.currentFolder().optionalTags().forEach(value => {
					let lower = value.toLowerCase();
					keywords.push({
						value: value,
						label: i18n('MESSAGE_TAGS/'+lower, 0, lower)
					});
				});
				return keywords
			},

			showKeywords: () => FolderUserStore.currentFolder().permanentFlags().some(isAllowedKeyword),

			repliedOptions: () => {
				translateTrigger();
				return [
					{ id: -1, name: '' },
					{ id: 1, name: i18n('GLOBAL/YES') },
					{ id: 0, name: i18n('GLOBAL/NO') }
				];
			},

			selectedDates: () => {
				translateTrigger();
				let prefix = 'SEARCH/DATE_';
				return [
					{ id: -1, name: i18n(prefix + 'ALL') },
					{ id: 3, name: i18n(prefix + '3_DAYS') },
					{ id: 7, name: i18n(prefix + '7_DAYS') },
					{ id: 30, name: i18n(prefix + 'MONTH') },
					{ id: 90, name: i18n(prefix + '3_MONTHS') },
					{ id: 180, name: i18n(prefix + '6_MONTHS') },
					{ id: 365, name: i18n(prefix + 'YEAR') }
				];
			},

			selectedTree: () => {
				translateTrigger();
				let prefix = 'SEARCH/SUBFOLDERS_';
				return [
					{ id: '', name: i18n(prefix + 'NONE') },
					{ id: 'subtree-one', name: i18n(prefix + 'SUBTREE_ONE') },
					{ id: 'subtree', name: i18n(prefix + 'SUBTREE') }
				];
			}
		});
	}

	submitForm() {
		const search = this.buildSearchString();
		if (search) {
			MessagelistUserStore.mainSearch(search);
		}

		this.close();
	}

	buildSearchString() {
		const
			self = this,
			data = new FormData(),
			append = (key, value) => value.length && data.append(key, value);

		append('from', self.from().trim());
		append('to', self.to().trim());
		append('subject', self.subject().trim());
		append('text', self.text().trim());
		append('keyword', self.keyword());
		append('in', self.selectedTreeValue());
		if (-1 < self.selectedDateValue()) {
			let d = new Date();
			d.setDate(d.getDate() - self.selectedDateValue());
			append('since', d.toISOString().split('T')[0]);
		}

		let result = decodeURIComponent(new URLSearchParams(data).toString());

		if (self.hasAttachment()) {
			result += '&attachment';
		}
		if (self.unseen()) {
			result += '&unseen';
		}
		if (self.starred()) {
			result += '&flagged';
		}
		if (1 == self.repliedValue()) {
			result += '&answered';
		}
		if (0 == self.repliedValue()) {
			result += '&unanswered';
		}

		return result.replace(/^&+/, '');
	}

	onShow(search) {
		const self = this,
			params = new URLSearchParams('?'+search);
		self.from(pString(params.get('from')));
		self.to(pString(params.get('to')));
		self.subject(pString(params.get('subject')));
		self.text(pString(params.get('text')));
		self.keyword(pString(params.get('keyword')));
		self.selectedTreeValue(pString(params.get('in')));
//		self.selectedDateValue(params.get('since'));
		self.selectedDateValue(-1);
		self.hasAttachment(params.has('attachment'));
		self.starred(params.has('flagged'));
		self.unseen(params.has('unseen'));
		if (params.has('answered')) {
			self.repliedValue(1);
		} else if (params.has('unanswered')) {
			self.repliedValue(0);
		}
	}
}
