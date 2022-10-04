import ko from 'ko';

import { logoutLink } from 'Common/Links';
import { i18nToNodes, initOnStartOrLangChange } from 'Common/Translator';

import { LanguageStore } from 'Stores/Language';
import { ThemeStore } from 'Stores/Theme';

import { SelectComponent } from 'Component/Select';
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
			setTimeout(() => location.href = url, 100);
		} else {
			rl.route.reload();
		}
	}

	bootstart() {
		const register = (key, ClassObject) => ko.components.register(key, {
				template: { element: key + 'Component' },
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
		register('Select', SelectComponent);
		register('Checkbox', CheckboxComponent);

		initOnStartOrLangChange();

		LanguageStore.populate();
		ThemeStore.populate();

		this.start();
	}
}
