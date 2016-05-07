
import window from 'window';
import $ from '$';

import rainLoopStorage from 'Storage/RainLoop';

window.__rlah = () => {
	return rainLoopStorage ? rainLoopStorage.getHash() : null;
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

window.__includeScr = (src) => {
	window.document.write(unescape('%3Csc' + 'ript data-cfasync="false" type="text/jav' + 'ascr' + 'ipt" sr' + 'c="' + src + '"%3E%3C/' + 'scr' + 'ipt%3E'));
};

window.__includeAppScr = (src) => {
	window.__includeScr(src + (window.__rlah ? window.__rlah() || '0' : '0') + '/' + window.Math.random().toString().substr(2) + '/');
};

window.__includeStyle = (styles) => {
	window.document.write(unescape('%3Csty' + 'le%3E' + styles + '"%3E%3C/' + 'sty' + 'le%3E'));
};

window.__showError = (additionalError) => {

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

	if (window.rainloopProgressJs)
	{
		window.rainloopProgressJs.set(100);
	}
};

window.__showDescription = (description) => {

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
};

window.__runBoot = (withError, additionalError) => {
	if (window.__APP_BOOT && !withError) {
		window.__APP_BOOT(function (bV) {
			if (!bV) {
				window.__showError(additionalError);
			}
		});
	} else {
		window.__showError(additionalError);
	}
};

window.__runApp = (BaseAppLibsScriptLink, BaseAppMainScriptLink, BaseAppEditorScriptLink) => {

	const appData = window.rainloopAppData;

	if (window.$LAB && window.progressJs && appData && appData.TemplatesLink && appData.LangLink)
	{
		const p = window.progressJs();
		window.rainloopProgressJs = p;

		p.setOptions({theme: 'rainloop'});
		p.start().set(5);

		window.$LAB
			.script(function () {
				return [
					{src: BaseAppLibsScriptLink, type: 'text/javascript', charset: 'utf-8'}
				];
			})
			.wait(function () {

				p.set(20);

				if (appData.IncludeBackground && $) {
					$('#rl-bg').attr('style', 'background-image: none !important;')
						.backstretch(appData.IncludeBackground.replace('{{USER}}',
							(window.__rlah ? window.__rlah() || '0' : '0')), {fade: 100, centeredX: true, centeredY: true})
						.removeAttr('style')
					;
				}
			})
			.script(function () {
				return [
					{src: appData.TemplatesLink, type: 'text/javascript', charset: 'utf-8'},
					{src: appData.LangLink, type: 'text/javascript', charset: 'utf-8'}
				];
			})
			.wait(function () {
				p.set(30);
			})
			.script(function () {
				return {src: BaseAppMainScriptLink, type: 'text/javascript', charset: 'utf-8'};
			})
			.wait(function () {
				p.set(50);
			})
			.script(function () {
				return appData.PluginsLink ? {src: appData.PluginsLink, type: 'text/javascript', charset: 'utf-8'} : null;
			})
			.wait(function () {
				p.set(70);
				window.__runBoot(false);
			})
			.script(function () {
				return {src: BaseAppEditorScriptLink, type: 'text/javascript', charset: 'utf-8'};
			})
			.wait(function () {
				if (window.CKEDITOR && window.__initEditor) {
					window.__initEditor();
					window.__initEditor = null;
				}
			})
		;
	}
	else
	{
		window.__runBoot(true);
	}
};
