/*!
	* Native JavaScript for Bootstrap v3.0.10 (https://thednp.github.io/bootstrap.native/)
	* Copyright 2015-2020 © dnp_theme
	* Licensed under MIT (https://github.com/thednp/bootstrap.native/blob/master/LICENSE)
	*/

(doc => {
	const setFocus = element => element.focus ? element.focus() : element.setActive();

	this.BSN = {
		Dropdown: function(toggleBtn) {
			let menu, menuItems = [];
			const self = this,
				parent = toggleBtn.parentNode,
				preventEmptyAnchor = e => {
					const t = e.target, href = t.href || (t.parentNode && t.parentNode.href);
					(href && href.slice(-1) === '#') && e.preventDefault();
				},
				open = bool => {
					menu && menu.classList.toggle('show', bool);
					parent.classList.toggle('show', bool);
					toggleBtn.setAttribute('aria-expanded', bool);
					toggleBtn.open = bool;
					if (bool) {
						toggleBtn.removeEventListener('click',clickHandler);
					} else {
						setTimeout(() => toggleBtn.addEventListener('click',clickHandler), 1);
					}
				},
				toggleEvents = () => {
					let action = (toggleBtn.open ? 'add' : 'remove') + 'EventListener';
					doc[action]('click',dismissHandler);
					doc[action]('keydown',preventScroll);
					doc[action]('keyup',keyHandler);
					doc[action]('focus',dismissHandler);
				},
				dismissHandler = e => {
					let eventTarget = e.target;
					if ((!menu.contains(eventTarget) && !toggleBtn.contains(eventTarget)) || e.type !== 'focus') {
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
							isMenuButton = activeItem === toggleBtn,
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
					setFocus( menu.getElementsByTagName('INPUT')[0] || toggleBtn );
					toggleEvents();
				},1);
			};
			self.hide = () => {
				open(false);
				toggleEvents();
				setFocus(toggleBtn);
			};
			self.toggle = () => toggleBtn.open ? self.hide() : self.show();
			open(false);
			toggleBtn.Dropdown = self;
		}
	};

})(document);
