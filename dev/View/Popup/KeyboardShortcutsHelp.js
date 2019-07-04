import _ from '_';
import key from 'key';

import { KeyState, Magics } from 'Common/Enums';

import { popup } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/KeyboardShortcutsHelp',
	templateID: 'PopupsKeyboardShortcutsHelp'
})
class KeyboardShortcutsHelpPopupView extends AbstractViewNext {
	constructor() {
		super();
		this.sDefaultKeyScope = KeyState.PopupKeyboardShortcutsHelp;
	}

	onBuild(dom) {
		key(
			'tab, shift+tab, left, right',
			KeyState.PopupKeyboardShortcutsHelp,
			_.throttle((event, handler) => {
				if (event && handler) {
					const $tabs = dom.find('.nav.nav-tabs > li'),
						isNext = handler && ('tab' === handler.shortcut || 'right' === handler.shortcut);

					let index = $tabs.index($tabs.filter('.active'));
					if (!isNext && 0 < index) {
						index -= 1;
					} else if (isNext && index < $tabs.length - 1) {
						index += 1;
					} else {
						index = isNext ? 0 : $tabs.length - 1;
					}

					$tabs
						.eq(index)
						.find('a[data-toggle="tab"]')
						.tab('show');
					return false;
				}

				return true;
			}, Magics.Time100ms)
		);
	}
}

export { KeyboardShortcutsHelpPopupView, KeyboardShortcutsHelpPopupView as default };
