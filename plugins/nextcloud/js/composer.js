(rl => {
//	if (rl.settings.get('Nextcloud'))

	addEventListener('rl-view-model.create', e => {
		if ('PopupsCompose' === e.detail.viewModelTemplateID) {
			let view = e.detail;
			view.nextcloudAttach = () => {
				rl.ncFiles.selectFiles().then(files => {
					files && files.forEach(file => {
						let attachment = view.addAttachmentHelper(
								Jua?.randomId(),
								file.name.replace(/^.*\/([^/]+)$/, '$1'),
								file.size
							);
						attachment
							.waiting(false)
							.uploading(true)
							.complete(false);

						rl.pluginRemoteRequest(
							(iError, data) => {
								attachment
									.uploading(false)
									.complete(true);
								if (iError) {
									attachment.error(data?.Result?.error || 'failed');
								} else {
									attachment.tempName(data.Result.tempName);
								}
							},
							'NextcloudAttachFile',
							{
								'file': file.name
							}
						);

					});
				});
			};
		}
	});

	let template = document.getElementById('PopupsCompose');
	const uploadBtn = template.content.querySelector('#composeUploadButton');
	if (uploadBtn) {
		uploadBtn.after(Element.fromHTML('<a class="btn fontastic"'
			+ ' data-bind="click: nextcloudAttach" data-i18n="[title]NEXTCLOUD/ATTACH_FILES">◦◯◦</a>'));
	}

})(window.rl);
