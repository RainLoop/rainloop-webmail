(rl => {
	const client_id = rl.pluginSettingsGet('login-gmail', 'client_id'),
		login = () => {
			document.location = 'https://accounts.google.com/o/oauth2/auth?' + (new URLSearchParams({
				response_type: 'code',
				client_id: client_id,
				redirect_uri: document.location.href + '?LoginGMail',
				scope: [
					// Primary Google Account email address
					'https://www.googleapis.com/auth/userinfo.email',
					// Personal info
					'https://www.googleapis.com/auth/userinfo.profile',
					// Associate personal info
					'openid',
					// Access IMAP and SMTP through OAUTH
					'https://mail.google.com/'
				].join(' '),
				state: 'gmail', // + rl.settings.app('token') + localStorage.getItem('smctoken')
				// Force authorize screen, so we always get a refresh_token
				access_type: 'offline',
				prompt: 'consent'
			}));
		};

	if (client_id) {
		addEventListener('sm-user-login', e => {
			if (event.detail.get('Email').includes('@gmail.com')) {
				e.preventDefault();
				login();
			}
		});

		addEventListener('rl-view-model', e => {
			if ('Login' === e.detail.viewModelTemplateID) {
				const
					container = e.detail.viewModelDom.querySelector('#plugin-Login-BottomControlGroup'),
					btn = Element.fromHTML('<button type="button">GMail</button>'),
					div = Element.fromHTML('<div class="controls"></div>');
				btn.onclick = login;
				div.append(btn);
				container && container.append(div);
			}
		});
	}

})(window.rl);
