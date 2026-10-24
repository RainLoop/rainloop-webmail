(doc => {

	addEventListener('rl-view-model.create', event => {
		if ('SettingsSecurity' === event.detail.viewModelTemplateID) {
			const template = doc.getElementById('SettingsSecurity'),
				details = doc.createElement('details'),
				summary = doc.createElement('summary'),
				button = doc.createElement('button');
			summary.textContent = "Have i been pwned?"
			button.dataset.bind = "click:HibpCheck";
			button.textContent = "Check";
			details.append(summary, button);
			template.content.append(details);

			event.detail.HibpCheck = () => {
				// JsonHibpCheck
				rl.pluginRemoteRequest((iError, oData) => {
					console.dir({iError, oData});
				}, 'HibpCheck');

			};
		}
	});

})(document);
