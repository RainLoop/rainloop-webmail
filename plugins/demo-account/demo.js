(rl => {
	if (rl) {
/*
		addEventListener('rl-view-model', e => {
			const view = e.detail;
			if (view && 'Login' === view.viewModelTemplateID) {
				view.email(rl.settings.get('DemoEmail'));
				view.password('DemoPassword');
			}
		});
*/
		addEventListener('rl-vm-visible', e => {
			const view = e.detail;
			if (view && 'PopupsCompose' === view.viewModelTemplateID) {
				view.to('<' + rl.settings.get('Email') + '>');
//				view.to(view.from());
			}
			if (view && 'PopupsAsk' === view.viewModelTemplateID) {
				view.passphrase('demo');
			}
		});
	}

})(window.rl);
