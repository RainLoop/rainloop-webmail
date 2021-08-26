import { Scope } from 'Common/Enums';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class KeyboardShortcutsHelpPopupView extends AbstractViewPopup {
	constructor() {
		super('KeyboardShortcutsHelp');
		this.metaKey = shortcuts.getMetaKey();
	}

	onBuild(dom) {
		const tabs = dom.querySelectorAll('.tabs input'),
			last = tabs.length - 1;

//		shortcuts.add('tab', 'shift',
		shortcuts.add('tab,arrowleft,arrowright', '',
			Scope.KeyboardShortcutsHelp,
			event => {
				let next = 0;
				tabs.forEach((node, index) => {
					if (node.matches(':checked')) {
						if (['Tab','ArrowRight'].includes(event.key)) {
							next = index < last ? index+1 : 0;
						} else {
							next = index ? index-1 : last;
						}
					}
				});
				tabs[next].checked = true;
				return false;
			}
		);
	}
}
