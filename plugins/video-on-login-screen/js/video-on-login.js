(function ($, window) {

	$(function () {

		if (window.rl && window.rl && !window.rl.settingsGet('Auth'))
		{
			var
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

			$('#rl-bg').vide({
				'mp4': window.rl.pluginSettingsGet('video-on-login-screen', 'mp4_file') || '',
				'webm': window.rl.pluginSettingsGet('video-on-login-screen', 'webm_file') || '',
				'ogv': window.rl.pluginSettingsGet('video-on-login-screen', 'ogv_file') || ''
			}, {
				playbackRate: iRate,
				muted: !!window.rl.pluginSettingsGet('video-on-login-screen', 'muted')
			});
		}

	});

}($, window));

