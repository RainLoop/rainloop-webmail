(rl => {
//	if (rl.settings.get('Nextcloud'))

	addEventListener('rl-view-model.create', e => {
		if ('PopupsCompose' === e.detail.viewModelTemplateID) {
			let view = e.detail;
			view.nextcloudAttach = () => {
				rl.nextcloud.selectFiles().then(files => {
					let urls = [];
					files && files.forEach(file => {
						if (file.name) {
							let attachment = view.addAttachmentHelper(
									Jua?.randomId(),
									file.name.replace(/^.*\/([^/]+)$/, '$1'),
									file.size
								);

							rl.pluginRemoteRequest(
								(iError, data) => {
									attachment.uploading(false).complete(true);
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
						} else if (file.url) {
							urls.push(file.url);
						}
					});
					if (urls.length) {
						// TODO: other editors and text/plain
						// https://github.com/the-djmaze/snappymail/issues/981
						view.oEditor.editor.squire.insertHTML(urls.join("<br>"));
					}
				});
			};
		}
	});

	let template = document.getElementById('PopupsCompose');
	const uploadBtn = template.content.querySelector('#composeUploadButton');
	if (uploadBtn) {
		uploadBtn.after(Element.fromHTML(`<a class="btn fontastic" data-bind="click: nextcloudAttach"
			data-i18n="[title]NEXTCLOUD/ATTACH_FILES">◦◯◦</a>`));
	}

/**
	https://docs.nextcloud.com/server/latest/developer_manual/client_apis/OCS/ocs-share-api.html
	POST /ocs/v2.php/apps/files_sharing/api/v1/shares
	JSON {
		"path":"/Nextcloud intro.mp4",
		"shareType":3, // public link
		"shareWith":"user@example.com",
//		"publicUpload":false,
//		"password":null,
//		"permissions":1, // default
//		"expireDate":"YYYY-MM-DD",
//		"note":"Especially for you"
	}
*/

})(window.rl);
