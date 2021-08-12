/*!
	* Native JavaScript for Bootstrap v3.0.10 (https://thednp.github.io/bootstrap.native/)
	* Copyright 2015-2020 © dnp_theme
	* Licensed under MIT (https://github.com/thednp/bootstrap.native/blob/master/LICENSE)
	*/

(doc => {
	const setFocus = element => element.focus ? element.focus() : element.setActive();

	this.BSN = {
		Dropdown: function(element) {
			let menu, menuItems = [];
			const self = this,
				parent = element.parentNode,
				preventEmptyAnchor = e => {
					const t = e.target, href = t.href || (t.parentNode && t.parentNode.href);
					(href && href.slice(-1) === '#') && e.preventDefault();
				},
				open = bool => {
					menu && menu.classList.toggle('show', bool);
					parent.classList.toggle('show', bool);
					element.setAttribute('aria-expanded', bool);
					element.open = bool;
					if (bool) {
						element.removeEventListener('click',clickHandler);
					} else {
						setTimeout(() => element.addEventListener('click',clickHandler), 1);
					}
				},
				toggleEvents = () => {
					let action = (element.open ? 'add' : 'remove') + 'EventListener';
					doc[action]('click',dismissHandler);
					doc[action]('keydown',preventScroll);
					doc[action]('keyup',keyHandler);
					doc[action]('focus',dismissHandler);
				},
				dismissHandler = e => {
					let eventTarget = e.target,
						inside = menu.contains(eventTarget),
						hasData = eventTarget && (
							(eventTarget.getAttribute && eventTarget.getAttribute('data-toggle'))
							|| (eventTarget.parentNode && eventTarget.parentNode.getAttribute('data-toggle')));
					if (!(hasData && inside)
					 && !(e.type === 'focus' && (inside || eventTarget === element))
					) {
						self.hide();
						preventEmptyAnchor(e);
					}
				},
				clickHandler = e => {
					self.show();
					preventEmptyAnchor(e);
				},
				preventScroll = e => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault(),
				keyHandler = e => {
					if (e.key === 'Escape') {
						self.toggle();
					} else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
						let activeItem = doc.activeElement,
							isMenuButton = activeItem === element,
							idx = isMenuButton ? 0 : menuItems.indexOf(activeItem);
						if (parent.contains(activeItem)) {
							if (!isMenuButton) {
								idx = e.key === 'ArrowUp' ? (idx > 1 ? idx-1 : 0)
									: e.key === 'ArrowDown' ? (idx < menuItems.length-1 ? idx+1 : idx) : idx;
							}
							menuItems[idx] && setFocus(menuItems[idx]);
						} else {
							console.log('activeElement not in menu');
						}
					}
				};
			self.show = () => {
				menu = parent.querySelector('.dropdown-menu');
				menuItems = [...menu.querySelectorAll('A')].filter(item => 'none' != item.parentNode.style.display);
				!('tabindex' in menu) && menu.setAttribute('tabindex', '0');
				open(true);
				setTimeout(() => {
					setFocus( menu.getElementsByTagName('INPUT')[0] || element );
					toggleEvents();
				},1);
			};
			self.hide = () => {
				open(false);
				toggleEvents();
				setFocus(element);
			};
			self.toggle = () => element.open ? self.hide() : self.show();
			open(false);
			element.Dropdown = self;
		}
	};

})(document);
