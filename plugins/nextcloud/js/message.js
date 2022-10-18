(rl => {

	function browseFiles(path = '/')
	{
		rl.ncFiles.getDirectoryContents(path).then(elemList => {
			console.dir(elemList);
		}).catch(err => console.error(err))
	}

	addEventListener('rl-view-model.create', e => {
		if ('MailMessageView' === e.detail.viewModelTemplateID) {
			let view = e.detail;
			view.saveNextcloudError = ko.observable(false).extend({ falseTimeout: 7000 });
			view.saveNextcloudLoading = ko.observable(false);
			view.saveNextcloud = () => {
				const
					hashes = (view.message()?.attachments || [])
					.map(item => item?.checked() /*&& !item?.isLinked()*/ ? item.download : '')
					.filter(v => v);
				if (hashes.length) {
					view.saveNextcloudLoading(true);
					rl.fetchJSON('./?/Json/&q[]=/0/', {}, {
						Action: 'AttachmentsActions',
						Do: 'nextcloud',
						Hashes: hashes
					})
					.then(result => {
						view.saveNextcloudLoading(false);
						if (result?.Result) {
							// success
						} else {
							view.saveNextcloudError(true);
						}
					})
					.catch(() => {
						view.saveNextcloudLoading(false);
						view.saveNextcloudError(true);
					});
				}
			};

			view.nextcloudSaveMsg = () => {
				let msg = view.message();

				/**
				 * TODO: op select screen to show browseFiles result
				 * Then the user can select which Nextcloud folder to save to
				 */
//				browseFiles();

				rl.pluginRemoteRequest(
					(iError, data) => {
						console.dir({
							iError:iError,
							data:data
						});
					},
					'NextcloudSaveMsg',
					{
						'msgHash': msg.requestHash,
						'filename': msg.subject()
					}
				);
			};
		}
	});

	let template = document.getElementById('MailMessageView');

	const attachmentsControls = template.content.querySelector('.attachmentsControls');
	if (attachmentsControls) {
		attachmentsControls.append(Element.fromHTML('<span>'
			+ '<i class="fontastic iconcolor-red" data-bind="visible: saveNextcloudError">✖</i>'
			+ '<i class="fontastic" data-bind="visible: !saveNextcloudError(), css: {\'icon-spinner\': saveNextcloudLoading()}">💾</i>'
			+ '<span class="g-ui-link" data-bind="click: saveNextcloud" data-i18n="NEXTCLOUD/SAVE_ATTACHMENTS"></span>'
		+ '</span>'));
	}

	const msgMenu = template.content.querySelector('#more-view-dropdown-id + menu');
	if (msgMenu) {
		msgMenu.append(Element.fromHTML('<li role="presentation">'
			+ '<a href="#" tabindex="-1" data-icon="📥" data-bind="click: nextcloudSaveMsg" data-i18n="NEXTCLOUD/SAVE_EML"></a>'
		+ '</li>'));
	}

})(window.rl);
