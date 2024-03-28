(rl => {
	if (rl) {
		addEventListener('rl-view-model', e => {
			// instanceof LoginUserView
			if (e.detail && 'Login' === e.detail.viewModelTemplateID) {
				const LoginUserView = e.detail,
					submitCommand = LoginUserView.submitCommand;
				LoginUserView.submitCommand = (self, event) => {
					if (LoginUserView.email().includes('@gmail.com')) {
						// TODO: redirect to google
					} else {
						submitCommand.call(LoginUserView, self, event);
					}
				};
			}
		});
	}

})(window.rl);
