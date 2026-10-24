((rl) => {
	const Folders = ko.computed(() => {
		const
			aResult = [{
				id: -1,
				name: ''
			}],
			sDeepPrefix = '\u00A0\u00A0\u00A0',
			showUnsubscribed = true/*!SettingsUserStore.hideUnsubscribed()*/,
			foldersWalk = folders => {
				folders.forEach(oItem => {
					if (showUnsubscribed || oItem.hasSubscriptions() || !oItem.exists) {
						aResult.push({
							id: oItem.fullName,
							name: sDeepPrefix.repeat(oItem.deep) + oItem.detailedName()
						});
					}

					if (oItem.subFolders.length) {
						foldersWalk(oItem.subFolders());
					}
				});
			};
		foldersWalk(rl.app.folderList());
		return aResult;
	});

	const Priorities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
	const searchQ = ko.observable(''),
		priority = ko.observable(1),
		oldSearchQ = ko.observable(''),
		fFolder = ko.observable(''),
		fSeen = ko.observable(false),
		fFlag = ko.observable(false),
		ioFilters = ko.observableArray([]);

	const i18n = (val) => rl.i18n(`SFILTERS/${val}`);

	const ServerActions = {
		GetFilters(loading) {
			ioFilters([]);
			rl.pluginRemoteRequest((iError, oData) => {
				if (iError) return console.error(iError);

				oData.Result.SFilters.forEach((f) => ioFilters.push(ko.observable(f)));

				if (loading) loading(false);
			}, 'SGetFilters');
		},
		GetFilter() {
			rl.pluginRemoteRequest(
				(iError, oData) => {
					if (iError) return console.error(iError);

					const filter = oData.Result.SFilter || {};
					priority(filter.priority || 1);
					fFolder(filter.fFolder);
					fSeen(filter.fSeen);
					fFlag(filter.fFlag);
				},
				'SGetFilters',
				{
					SSearchQ: searchQ()
				}
			);
		},
		AddOrEditFilter() {
			rl.pluginRemoteRequest(
				(iError, oData) => {
					if (!iError) this.GetFilters();
				},
				'SAddEditFilter',
				{
					SFilter: {
						searchQ: oldSearchQ() || searchQ(),
						priority: priority(),
						fFolder: fFolder(),
						fSeen: fSeen(),
						fFlag: fFlag()
					}
				}
			);
		},
		UpdateSearchQ(newSearchQ) {
			rl.pluginRemoteRequest(
				(iError, oData) => {
					if (!iError) this.GetFilters();
				},
				'SUpdateSearchQ',
				{
					SFilter: {
						oldSearchQ: oldSearchQ(),
						searchQ: newSearchQ
					}
				}
			);
		},
		RemoveFilter(searchQToRemove) {
			rl.pluginRemoteRequest(
				(iError, oData) => {
					if (iError) return console.error(iError, oData);
					const index = ioFilters().findIndex((f) => f.searchQ() === searchQToRemove);
					ioFilters.splice(index, 1);
				},
				'SDeleteFilter',
				{
					SSearchQ: searchQToRemove
				}
			);
		}
	};

	addEventListener('rl-view-model', (event) => {
		const advS = event.detail;
		if (advS.viewModelTemplateID == 'PopupsAdvancedSearch') {
			const button = document.createElement('button');
			button.setAttribute('class', 'btn');
			button.setAttribute('data-i18n', 'SFILTERS/CREATE_FILTER');
			button.addEventListener('click', function () {
				searchQ(advS.buildSearchString());
				if (searchQ()) SearchFiltersPopupView.showModal();
			});

			const footer = advS.querySelector('footer');
			footer.style.display = 'flex';
			footer.style.justifyContent = 'space-between';

			footer.prepend(button);
		}
	});

	class SearchFiltersSettingsTab {
		constructor() {
			this.folders = Folders;
			this.Priorities = Priorities;
			this.ioFilters = ioFilters;

			this.loading = ko.observable(false);
			this.saving = ko.observable(false);

			this.i18n = i18n;

			this.savingOrLoading = ko.computed(() => {
				return this.loading() || this.saving();
			});
		}

		edit(filter) {
			oldSearchQ(filter.searchQ);
			searchQ(filter.searchQ);
			priority(filter.priority || 1);
			fFolder(filter.fFolder);
			fSeen(filter.fSeen);
			fFlag(filter.fFlag);
			AdvancedSearchPopupView.showModal();
		}

		remove(filter) {
			ServerActions.RemoveFilter(filter.searchQ);
		}

		onShow() {
			this.clear();
			this.loading(true);
			ServerActions.GetFilters(this.loading);
		}

		clear() {
			this.ioFilters([]);
			this.loading(false);
			this.saving(false);
		}
	}

	rl.addSettingsViewModel(SearchFiltersSettingsTab, 'STabSearchFilters', 'Search Filters', 'searchfilters');

	class SearchFiltersPopupView extends rl.pluginPopupView {
		constructor() {
			super('SearchFilters');

			this.folders = Folders;
			this.Priorities = Priorities;

			this.priority = priority;
			this.fFolder = fFolder;
			this.fSeen = fSeen;
			this.fFlag = fFlag;

			this.usefFolder = ko.observable(false);
			this.fFolder.subscribe((v) => this.usefFolder(!!v));
		}

		submitForm() {
			if (!this.usefFolder()) fFolder('');
			ServerActions.AddOrEditFilter();
			this.close();
		}

		beforeShow() {
			if (!oldSearchQ()) {
				ServerActions.GetFilter();
			} else {
				this.usefFolder(!!fFolder());
			}
		}
	}

	class AdvancedSearchPopupView extends rl.pluginPopupView {
		constructor() {
			super('STabAdvancedSearch');

			this.addObservables({
				from: '',
				to: '',
				subject: '',
				text: '',
				repliedValue: -1,
				selectedDateValue: -1,
				selectedTreeValue: '',

				hasAttachment: false,
				starred: false,
				unseen: false
			});

			this.addComputables({
				repliedOptions: () => {
					return [
						{ id: -1, name: '' },
						{ id: 1, name: rl.i18n('GLOBAL/YES') },
						{ id: 0, name: rl.i18n('GLOBAL/NO') }
					];
				},

				selectedDates: () => {
					let prefix = 'SEARCH/DATE_';
					return [
						{ id: -1, name: rl.i18n(prefix + 'ALL') },
						{ id: 3, name: rl.i18n(prefix + '3_DAYS') },
						{ id: 7, name: rl.i18n(prefix + '7_DAYS') },
						{ id: 30, name: rl.i18n(prefix + 'MONTH') },
						{ id: 90, name: rl.i18n(prefix + '3_MONTHS') },
						{ id: 180, name: rl.i18n(prefix + '6_MONTHS') },
						{ id: 365, name: rl.i18n(prefix + 'YEAR') }
					];
				},

				selectedTree: () => {
					let prefix = 'SEARCH/SUBFOLDERS_';
					return [
						{ id: '', name: rl.i18n(prefix + 'NONE') },
						{ id: 'subtree-one', name: rl.i18n(prefix + 'SUBTREE_ONE') },
						{ id: 'subtree', name: rl.i18n(prefix + 'SUBTREE') }
					];
				}
			});
		}

		submitForm() {
			const newSearchQ = this.buildSearchString();
			if (newSearchQ != oldSearchQ()) ServerActions.UpdateSearchQ(newSearchQ);
			this.close();
		}

		editFilters() {
			SearchFiltersPopupView.showModal();
		}

		buildSearchString() {
			const self = this,
				data = new FormData(),
				append = (key, value) => value.length && data.append(key, value);

			append('from', self.from().trim());
			append('to', self.to().trim());
			append('subject', self.subject().trim());
			append('text', self.text().trim());
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

		onShow() {
			const pString = (value) => (null != value ? '' + value : '');

			const self = this,
				params = new URLSearchParams('?' + searchQ());
			self.from(pString(params.get('from')));
			self.to(pString(params.get('to')));
			self.subject(pString(params.get('subject')));
			self.text(pString(params.get('text')));
			self.selectedTreeValue(pString(params.get('in')));
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

		clear() {
			oldSearchQ('');
			searchQ('');
			fFolder('');
			priority(1);
			fSeen(false);
			fFlag(false);
		}

		onHide() {
			this.clear();
		}
	}
})(window.rl);
