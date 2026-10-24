(rl => {
	const templateId = 'PopupsCompose',
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

				foldersWalk = folders => {
					folders.forEach(oItem => {
						if (showUnsubscribed || oItem.hasSubscriptions() || !oItem.exists) {
							aResult.push({
								id: oItem.fullName,
								name: sDeepPrefix.repeat(oItem.deep) + oItem.detailedName(),
								system: false,
								disabled: !oItem.selectable()
							});
						}

						if (oItem.subFolders.length) {
							foldersWalk(oItem.subFolders());
						}
					});
				};


			// FolderUserStore.folderList()
			foldersWalk(rl.app.folderList() || []);

			return aResult;
		};

	let oldSentFolderFn;

	addEventListener('rl-view-model.create', e => {
		if (templateId === e.detail.viewModelTemplateID) {
			const view = e.detail; // ComposePopupView

			view.sentFolderValue = ko.observable('');
			view.sentFolderSelectList = ko.computed(folderListOptionsBuilder, {'pure':true});
			view.defaultOptionsAfterRender = (domItem, item) =>
				item && undefined !== item.disabled && domItem?.classList.toggle('disabled', domItem.disabled = item.disabled);

			oldSentFolderFn = view.sentFolder.bind(view);
			view.sentFolder = () => view.sentFolderValue() || oldSentFolderFn();

			document.getElementById(templateId).content.querySelector('.b-header tbody').append(Element.fromHTML(`
			<tr>
				<td>Store in</td>
				<td>
					<select class="span3" data-bind="options: sentFolderSelectList, value: sentFolderValue,
						optionsText: 'name', optionsValue: 'id', optionsAfterRender: defaultOptionsAfterRender"></select>
					(When send, store a copy of the message in the selected folder)
				</td>
			</tr>`));

			view.currentIdentity.subscribe(()=>{
				view.sentFolderValue(oldSentFolderFn());
			});
		}
	});

	addEventListener('rl-vm-visible', e => {
		if (templateId === e.detail.viewModelTemplateID) {
			const view = e.detail; // ComposePopupView
			view.sentFolderValue(oldSentFolderFn());
		}
	});

})(window.rl);
