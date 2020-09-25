import { KeyState } from 'Common/Enums';

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
		dom.querySelectorAll('a[data-toggle="tab"]').forEach(node => node.Tab || new BSN.Tab(node));

//		shortcuts.add('tab', 'shift',
		shortcuts.add(['tab','arrowleft','arrowright'], '',
			KeyState.PopupKeyboardShortcutsHelp,
			((event, handler)=>{
				if (event && handler) {
					const tabs = dom.querySelectorAll('.nav.nav-tabs > li'),
						last = tabs.length - 1;
					let next = 0;
					tabs.forEach((node, index) => {
						if (node.matches('.active')) {
							if (['tab','arrowright'].includes(handler.shortcut)) {
								next = index < last ? index+1 : 0;
							} else {
								next = index ? index-1 : last;
							}
						}
					});

					tabs[next].querySelector('a[data-toggle="tab"]').Tab.show();
				}
			}).throttle(100)
		);
	}
}

export { KeyboardShortcutsHelpPopupView, KeyboardShortcutsHelpPopupView as default };
