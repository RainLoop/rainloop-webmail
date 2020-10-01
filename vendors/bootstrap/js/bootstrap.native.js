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
						hasData = eventTarget && (eventTarget.getAttribute('data-toggle')
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
					let activeItem = doc.activeElement,
						isSameElement = activeItem === element,
						isInsideMenu = menu.contains(activeItem),
						isMenuItem = activeItem.parentNode === menu || activeItem.parentNode.parentNode === menu,
						idx = menuItems.indexOf(activeItem);
					if ( isMenuItem ) {
						idx = isSameElement ? 0
							: e.key === 'ArrowUp' ? (idx>1?idx-1:0)
							: e.key === 'ArrowDown' ? (idx<menuItems.length-1?idx+1:idx) : idx;
						menuItems[idx] && setFocus(menuItems[idx]);
					}
					if ( (menuItems.length && isMenuItem
						|| !menuItems.length && (isInsideMenu || isSameElement)
						|| !isInsideMenu )
						&& element.open && e.key === 'Escape'
					) {
						self.toggle();
					}
				};
			self.show = () => {
				menu = parent.querySelector('.dropdown-menu');
				menuItems = [];
				[...menu.children].forEach(child => {
					child.children.length && (child.children[0].tagName === 'A' && menuItems.push(child.children[0]));
					child.tagName === 'A' && menuItems.push(child);
				});
				!('tabindex' in menu) && menu.setAttribute('tabindex', '0');
				menu.classList.add('show');
				parent.classList.add('show');
				element.setAttribute('aria-expanded',true);
				element.open = true;
				element.removeEventListener('click',clickHandler);
				setTimeout(() => {
					setFocus( menu.getElementsByTagName('INPUT')[0] || element );
					toggleEvents();
				},1);
			};
			self.hide = () => {
				menu.classList.remove('show');
				parent.classList.remove('show');
				element.setAttribute('aria-expanded',false);
				element.open = false;
				toggleEvents();
				setFocus(element);
				setTimeout(() => element.Dropdown && element.addEventListener('click',clickHandler), 1);
			};
			self.toggle = () => (parent.classList.contains('show') && element.open) ? self.hide() : self.show();
			element.addEventListener('click',clickHandler);
			element.open = false;
			element.Dropdown = self;
		},

		Tab: class {
			constructor(element) {
				this.element = element
				element.Tab = this;
				element.addEventListener('click', e => {
					e.preventDefault();
					this.show();
				});
			}

			show() {
				const el = this.element, li = el.closest('li');
				if (!li.classList.contains('active')) {
					const previous = el.closest('ul').querySelector('.active a');
					previous.closest('li').classList.remove('active');
					doc.querySelector(previous.getAttribute('href')).classList.remove('active');
					li.classList.add('active');
					doc.querySelector(el.getAttribute('href')).classList.add('active');
				}
			}
		}
	};

})(document);
