
(rl => {

	rl && addEventListener('rl-view-model', e => {
		const id = e.detail.viewModelTemplateID;
		if (e.detail && ('AdminLogin' === id || 'Login' === id)
		 && rl.pluginSettingsGet('recaptcha', 'show_captcha_on_login')) {
			let
				nId = null,
				script;

			const
				mode = 'Login' === id ? 'user' : 'admin',

				doc = document,

				container = e.detail.viewModelDom.querySelector('#plugin-Login-BottomControlGroup'),

				ShowRecaptcha = () => {
					if (window.grecaptcha && null === nId && container) {
						const oEl = doc.createElement('div');
						oEl.className = 'controls';

						container.after(oEl);

						nId = window.grecaptcha.render(oEl, {
							'sitekey': rl.pluginSettingsGet('recaptcha', 'public_key'),
							'theme': rl.pluginSettingsGet('recaptcha', 'theme')
						});
					}
				},

				StartRecaptcha = () => {
					if (window.grecaptcha) {
						ShowRecaptcha();
					} else if (!script) {
						script = doc.createElement('script');
//						script.onload = ShowRecaptcha;
						script.src = 'https://www.recaptcha.net/recaptcha/api.js?onload=ShowRecaptcha&render=explicit&hl=' + doc.documentElement.lang;
						doc.head.append(script);
					}
				};

			window.ShowRecaptcha = ShowRecaptcha;

			StartRecaptcha();

			addEventListener(`sm-${mode}-login`, e => {
				if (null !== nId && window.grecaptcha) {
					e.detail.set('RecaptchaResponse', window.grecaptcha.getResponse(nId));
				} else {
					e.preventDefault();
				}
			});

			addEventListener(`sm-${mode}-login-response`, e => {
				if (e.detail.error) {
					if (null !== nId && window.grecaptcha) {
						window.grecaptcha.reset(nId);
					} else if (e.detail.data && e.detail.data.Captcha) {
						StartRecaptcha();
					}
				}
			});
		}
	});

})(window.rl);
