
import window from 'window';
import $ from '$';
import progressJs from 'progressJs';

import rainLoopStorage from 'Storage/RainLoop';

let rlAppDataStorage = null;

window.__rlah = () => {
	return rainLoopStorage ? rainLoopStorage.getHash() : null;
};

window.__rlah_data = () => {
	return rlAppDataStorage;
};

window.__rlah_set = () => {
	if (rainLoopStorage)
	{
		rainLoopStorage.setHash();
	}
};

window.__rlah_clear = () => {
	if (rainLoopStorage)
	{
		rainLoopStorage.clearHash();
	}
};

function includeStyle(styles)
{
	window.document.write(unescape('%3Csty' + 'le%3E' + styles + '"%3E%3C/' + 'sty' + 'le%3E'));
}

function includeScr(src)
{
	window.document.write(unescape('%3Csc' + 'ript type="text/jav' + 'ascr' + 'ipt" data-cfasync="false" sr' + 'c="' + src + '"%3E%3C/' + 'scr' + 'ipt%3E'));
}

function includeLayout()
{
	const
		layout = require('Html/Layout.html'),
		app = window.document.getElementById('rl-app')
	;

	if (app && layout)
	{
		app.innerHTML = layout.replace(/[\r\n\t]+/g, '');
		return true;
	}

	return false;
}

function includeAppScr(data = {})
{
	let src = './?/';
	src += data.admin ? 'Admin' : '';
	src += 'AppData@';
	src += data.mobile ? 'mobile' : 'no-mobile';
	src += data.mobileDevice ? '-1' : '-0';
	src += '/';

	includeScr(src + (window.__rlah ? window.__rlah() || '0' : '0') + '/' + window.Math.random().toString().substr(2) + '/');
}

function getRainloopBootData()
{
	let result = {};
	const meta = window.document.getElementById('app-boot-data');

	if (meta && meta.getAttribute)
	{
		result = JSON.parse(meta.getAttribute('content')) || {};
	}

	return result;
}

function showError(additionalError)
{
	const
		oR = window.document.getElementById('rl-loading'),
		oL = window.document.getElementById('rl-loading-error'),
		oLA = window.document.getElementById('rl-loading-error-additional')
	;

	if (oR)
	{
		oR.style.display = 'none';
	}

	if (oL)
	{
		oL.style.display = 'block';
	}

	if (oLA && additionalError)
	{
		oLA.style.display = 'block';
		oLA.innerHTML = additionalError;
	}

	if (progressJs)
	{
		progressJs.set(100).end();
	}
}

function showDescriptionAndLoading(description)
{
	const
		oE = window.document.getElementById('rl-loading'),
		oElDesc = window.document.getElementById('rl-loading-desc')
	;

	if (oElDesc && description)
	{
		oElDesc.innerHTML = description;
	}

	if (oE && oE.style)
	{
		oE.style.opacity = 0;
		window.setTimeout(() => {
			oE.style.opacity = 1;
		}, 300);
	}
}

function runMainBoot(withError, additionalError)
{
	if (window.__APP_BOOT && !withError)
	{
		window.__APP_BOOT(function (bV) {
			if (!bV)
			{
				showError(additionalError);
			}
		});
	}
	else
	{
		showError(additionalError);
	}
}

function runApp()
{
	const appData = window.__rlah_data();

	if (window.jsloader && progressJs && appData && appData.TemplatesLink && appData.LangLink &&
		appData.StaticLibJsLink && appData.StaticAppJsLink && appData.StaticEditorJsLink)
	{
		const p = progressJs;

		p.setOptions({theme: 'rainloop'});
		p.start().set(5);

		const
			libs = window.jsloader(appData.StaticLibJsLink).then(() => {
				if (window.$)
				{
					if (!window.$('#rl-check').is(':visible'))
					{
						window.$('html').addClass('no-css');
						throw new Error('no-css');
					}

					window.$('#rl-check').remove();

					if (appData.IncludeBackground)
					{
						window.$('#rl-bg').attr('style', 'background-image: none !important;')
							.backstretch(appData.IncludeBackground.replace('{{USER}}',
								(window.__rlah ? (window.__rlah() || '0') : '0')), {fade: 100, centeredX: true, centeredY: true})
							.removeAttr('style')
						;
					}
				}
			}),
			common = window.Promise.all([
				window.jsloader(appData.TemplatesLink),
				window.jsloader(appData.LangLink)
			])
		;

		window.Promise.all([libs, common])
			.then(() => {
				p.set(30);
				return window.jsloader(appData.StaticAppJsLink);
			}).then(() => {
				p.set(50);
				return appData.PluginsLink ? window.jsloader(appData.PluginsLink) : window.Promise.resolve();
			}).then(() => {
				p.set(70);
				runMainBoot(false);
			}).catch((e) => {
				runMainBoot(true);
				throw e;
			}).then(() => {
				return window.jsloader(appData.StaticEditorJsLink);
			}).then(() => {
				if (window.CKEDITOR && window.__initEditor) {
					window.__initEditor();
					window.__initEditor = null;
				}
			})
		;
	}
	else
	{
		runMainBoot(true);
	}
}

window.__initAppData = function(data) {

	rlAppDataStorage = data;

	window.__rlah_set();

	if (rlAppDataStorage.NewThemeLink)
	{
		window.document.getElementById('app-theme-link').href = rlAppDataStorage.NewThemeLink;
	}

	if (rlAppDataStorage.IncludeCss)
	{
		includeStyle(rlAppDataStorage.IncludeCss);
	}

	showDescriptionAndLoading(rlAppDataStorage ? (rlAppDataStorage.LoadingDescriptionEsc || '') : '');

	runApp();
};

window.__runBoot = function() {

	if (!window.navigator || !window.navigator.cookieEnabled)
	{
		window.document.location.replace('./?/NoCookie');
	}

	if (includeLayout())
	{
		includeAppScr(getRainloopBootData());
	}
};

