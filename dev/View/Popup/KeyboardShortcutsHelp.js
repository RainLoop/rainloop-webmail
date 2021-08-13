import { Scope } from 'Common/Enums';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class KeyboardShortcutsHelpPopupView extends AbstractViewPopup {
	constructor() {
		super('KeyboardShortcutsHelp');
		this.metaKey = shortcuts.getMetaKey();
	}

	onBuild(dom) {
		const tabs = dom.querySelectorAll('.nav.nav-tabs > li'),
			last = tabs.length - 1,
			show = tab => {
				if (!tab.classList.contains('active')) {
					const previous = tab.parentElement.querySelector('.active');
					previous.classList.remove('active');
					dom.querySelector(previous.firstElementChild.getAttribute('href')).classList.remove('active');

					tab.classList.add('active');
					dom.querySelector(tab.firstElementChild.getAttribute('href')).classList.add('active');
				}
			};

		tabs.forEach(node => {
			node.addEventListener('click', e => {
				e.preventDefault();
				show(node);
			});
		});

//		shortcuts.add('tab', 'shift',
		shortcuts.add('tab,arrowleft,arrowright', '',
			Scope.KeyboardShortcutsHelp,
			event => {
				let next = 0;
				tabs.forEach((node, index) => {
					if (node.matches('.active')) {
						if (['Tab','ArrowRight'].includes(event.key)) {
							next = index < last ? index+1 : 0;
						} else {
							next = index ? index-1 : last;
						}
					}
				});

				show(tabs[next]);
				return false;
			}
		);
	}
}
