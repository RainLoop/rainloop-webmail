import ko from 'ko';

import {
	doc,
	$htmlCL,
	leftPanelDisabled,
	Settings
} from 'Common/Globals';

import { KeyState } from 'Common/Enums';
import { logoutLink } from 'Common/Links';
import { i18nToNodes, initOnStartOrLangChange } from 'Common/Translator';

import { LanguageStore } from 'Stores/Language';
import { ThemeStore } from 'Stores/Theme';

import { InputComponent } from 'Component/Input';
import { SelectComponent } from 'Component/Select';
import { TextAreaComponent } from 'Component/TextArea';
import { CheckboxMaterialDesignComponent } from 'Component/MaterialDesign/Checkbox';
import { CheckboxComponent } from 'Component/Checkbox';

export class AbstractApp {
	/**
	 * @param {RemoteStorage|AdminRemoteStorage} Remote
	 */
	constructor(Remote) {
		this.Remote = Remote;

		const refresh = (()=>dispatchEvent(new CustomEvent('rl.auto-logout-refresh'))).debounce(5000),
			fn = (ev=>{
				$htmlCL.toggle('rl-ctrl-key-pressed', ev.ctrlKey);
				refresh();
			}).debounce(500);

//		doc.addEventListener('touchstart', fn, {passive:true});
		['mousedown','keydown','keyup'/*,'mousemove'*/].forEach(t => doc.addEventListener(t, fn));

		shortcuts.add('escape,enter', '', KeyState.All, () => rl.Dropdowns.detectVisibility());
	}

	remote() {
		return null;
	}

	/**
	 * @param {string} link
	 * @returns {boolean}
	 */
	download(link) {
		if (Settings.app('mobile')) {
			open(link, '_self');
			focus();
		} else {
			const oLink = doc.createElement('a');
			oLink.href = link;
			doc.body.appendChild(oLink).click();
			oLink.remove();
		}
		return true;
	}

	/**
	 * @param {string} token
	 */
	setClientSideToken(token) {
		rl.hash.set();
		Settings.set('AuthAccountHash', token);
	}

	logoutReload(close = false) {
		const url = logoutLink();

		rl.hash.clear();
		close && window.close && window.close();

		if (location.href !== url) {
			setTimeout(() => (Settings.app('inIframe') ? parent : window).location.href = url, 100);
		} else {
			rl.route.reload();
		}
	}

	bootstart() {
		const mobile = Settings.app('mobile'),
			register = (key, ClassObject, templateID) => ko.components.register(key, {
				template: { element: templateID || (key + 'Component') },
				viewModel: {
					createViewModel: (params, componentInfo) => {
						params = params || {};
						params.element = null;

						if (componentInfo && componentInfo.element) {
							params.component = componentInfo;
							params.element = componentInfo.element;

							i18nToNodes(componentInfo.element);

							if (undefined !== params.inline && ko.unwrap(params.inline)) {
								params.element.style.display = 'inline-block';
							}
						}

						return new ClassObject(params);
					}
				}
			});

		register('Input', InputComponent);
		register('Select', SelectComponent);
		register('TextArea', TextAreaComponent);
		register('CheckboxSimple', CheckboxComponent, 'CheckboxComponent');
		if (mobile || !Settings.app('materialDesign')) {
			register('Checkbox', CheckboxComponent);
		} else {
			register('Checkbox', CheckboxMaterialDesignComponent, 'CheckboxMaterialDesignComponent');
		}

		initOnStartOrLangChange();

		if (mobile) {
			leftPanelDisabled(true);
		} else {
			window.addEventListener('resize', () => leftPanelDisabled(767 >= window.innerWidth));
		}

		leftPanelDisabled.valueHasMutated();

		LanguageStore.populate();
		ThemeStore.populate();
	}

	/**
	 * @returns {void}
	 */
	hideLoading() {
		const id = id => doc.getElementById(id);
		id('rl-content').hidden = false;
		id('rl-loading').remove();
	}

}
