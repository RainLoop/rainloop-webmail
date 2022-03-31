import ko from 'ko';

import { Settings } from 'Common/Globals';

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
	}

	logoutReload() {
		const url = logoutLink();

		if (location.href !== url) {
			setTimeout(() => (Settings.app('inIframe') ? parent : window).location.href = url, 100);
		} else {
			rl.route.reload();
		}
	}

	bootstart() {
		const register = (key, ClassObject, templateID) => ko.components.register(key, {
				template: { element: templateID || (key + 'Component') },
				viewModel: {
					createViewModel: (params, componentInfo) => {
						params = params || {};
						i18nToNodes(componentInfo.element);
						if (params.inline) {
							componentInfo.element.style.display = 'inline-block';
						}
						return new ClassObject(params);
					}
				}
			});

		register('Input', InputComponent);
		register('Select', SelectComponent);
		register('TextArea', TextAreaComponent);
		register('Checkbox', CheckboxMaterialDesignComponent, 'CheckboxMaterialDesignComponent');
		register('CheckboxSimple', CheckboxComponent, 'CheckboxComponent');

		initOnStartOrLangChange();

		LanguageStore.populate();
		ThemeStore.populate();

		this.start();
	}
}
