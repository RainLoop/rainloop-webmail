(function ($, window) {

	$(function () {

		if (window.rl && window.rl && !window.rl.settingsGet('Auth'))
		{
			$('#rl-bg').vide({
				'mp4': window.rl.pluginSettingsGet('video-on-login-screen', 'mp4_file') || '',
				'webm': window.rl.pluginSettingsGet('video-on-login-screen', 'webm_file') || '',
				'ogv': window.rl.pluginSettingsGet('video-on-login-screen', 'ogv_file') || ''
			}, {
				muted: !!window.rl.pluginSettingsGet('video-on-login-screen', 'muted')
			});
		}

	});

}($, window));

