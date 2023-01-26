(rl => {
//	if (rl.settings.get('Nextcloud'))

	addEventListener('rl-view-model.create', e => {
		if ('MailMessageList' === e.detail.viewModelTemplateID) {
			let view = e.detail;
			view.nextcloudSaveMsgs = () => {
				view.messageList.hasChecked()
				 && rl.nextcloud.selectFolder().then(folder => {
					folder && view.messageList.forEach(msg => {
						msg.checked() && rl.pluginRemoteRequest(
							(iError, data) => {
								console.dir({
									iError:iError,
									data:data
								});
							},
							'NextcloudSaveMsg',
							{
								'msgHash': msg.requestHash,
								'folder': folder,
								'filename': msg.subject()
							}
						);
					});
				});
			};
		}
	});

	const msgMenu = document.getElementById('MailMessageList')
		.content.querySelector('#more-list-dropdown-id + menu [data-bind*="forwardCommand"]');
	if (msgMenu) {
		msgMenu.after(Element.fromHTML(`<li role="presentation" data-bind="css:{disabled:!messageList.hasChecked()}">
			<a href="#" tabindex="-1" data-icon="📥" data-bind="click: nextcloudSaveMsgs" data-i18n="NEXTCLOUD/SAVE_EML"></a>
		</li>`));
	}

})(window.rl);
