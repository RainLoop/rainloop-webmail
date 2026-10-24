(rl => {

	rl && addEventListener('rl-view-model', e => {
		const id = e.detail.viewModelTemplateID;
		if (e.detail && ('AdminLogin' === id || 'Login' === id)) {
			let
				nId = null,
				script;

			let
				iRate = 1,
				sRate = window.rl.pluginSettingsGet('video-on-login-screen', 'playback_rate')
			;

			switch (sRate)
			{
				case '25%':
					iRate = 0.25;
					break;
				case '50%':
					iRate = 0.5;
					break;
				case '75%':
					iRate = 0.75;
					break;
				case '125%':
					iRate = 1.25;
					break;
				case '150%':
					iRate = 1.5;
					break;
				case '200%':
					iRate = 2;
					break;
			}
			const
				mode = 'Login' === id ? 'user' : 'admin',

				doc = document,
				loginContainer = doc.querySelectorAll('#V-Login #V-AdminLogin'),
				container = doc.querySelector('#rl-content'),

				ShowVideo = () => {
					if (loginContainer) {
						var stEl = doc.createElement('style');
						stEl.innerHTML =
							`
							#video-el {
								z-index: -1;
								overflow: hidden;
								position: absolute;
								left: 0;
								right: 0;
								top: 0;
								bottom: 0;
								margin: auto;
								height: 100vh;
								width: 100%;
								object-fit: cover;
							}
							`
						var ref = doc.querySelector('script');
						ref.parentNode.insertBefore(stEl, ref);

						const oEl = doc.createElement('div');
						oEl.className = 'video-div';
						const vEl = doc.createElement('video');
						vEl.setAttribute('loop', true);
						vEl.setAttribute('playsinline', '');
						vEl.setAttribute('muted', '');
						vEl.setAttribute('autoplay', '');
						vEl.muted = true;
						vEl.setAttribute('playbackRate', iRate);
						vEl.setAttribute('id', 'video-el');
						oEl.appendChild(vEl);
						const sEl = doc.createElement('source');
						sEl.setAttribute('src', rl.pluginSettingsGet('video-on-login-screen', 'mp4_file'));
						sEl.setAttribute('type', 'video/mp4');
						vEl.appendChild(sEl);

						container.before(oEl);

					}
				},

				DestroyVideo = () => {
					const vEl = doc.querySelector('#video-el');
					if (vEl) {
						vEl.parentElement.removeChild(vEl);
					}
				};

			window.ShowVideo = ShowVideo;

			window.DestroyVideo = DestroyVideo;

			ShowVideo();

			addEventListener(`sm-${mode}-login-response`, e => {
				if (!e.detail.error) {
					DestroyVideo();
				}
			});
		}
	});

})(window.rl);
