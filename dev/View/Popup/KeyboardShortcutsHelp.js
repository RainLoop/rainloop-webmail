import { Scope } from 'Common/Enums';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

class KeyboardShortcutsHelpPopupView extends AbstractViewPopup {
	constructor() {
		super('KeyboardShortcutsHelp');
	}

	onBuild(dom) {
		dom.querySelectorAll('a[data-toggle="tab"]').forEach(node => node.Tab || new BSN.Tab(node));

//		shortcuts.add('tab', 'shift',
		shortcuts.add('tab,arrowleft,arrowright', '',
			Scope.KeyboardShortcutsHelp,
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
