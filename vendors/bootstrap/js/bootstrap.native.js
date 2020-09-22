/*!
	* Native JavaScript for Bootstrap v3.0.10 (https://thednp.github.io/bootstrap.native/)
	* Copyright 2015-2020 © dnp_theme
	* Licensed under MIT (https://github.com/thednp/bootstrap.native/blob/master/LICENSE)
	*/

window.BSN = (() => {
	'use strict';

	const doc = document,
		setFocus = element => element.focus ? element.focus() : element.setActive();

	return {
		Dropdown: function(element) {
			let menu, menuItems = [];
			const self = this,
				parent = element.parentNode,
				preventEmptyAnchor = e => {
					const t = e.target, href = t.href || (t.parentNode && t.parentNode.href);
					(href && href.slice(-1) === '#') && e.preventDefault();
				},
				toggleEvents = () => {
					let action = element.open ? 'addEventListener' : 'removeEventListener';
					doc[action]('click',dismissHandler,false);
					doc[action]('keydown',preventScroll,false);
					doc[action]('keyup',keyHandler,false);
					doc[action]('focus',dismissHandler,false);
				},
				dismissHandler = e => {
					let eventTarget = e.target,
						inside = menu.contains(eventTarget),
						hasData = eventTarget && (eventTarget.getAttribute('data-toggle')
							|| (eventTarget.parentNode && eventTarget.parentNode.getAttribute('data-toggle')));
					if ((e.type === 'focus' && (eventTarget === element || inside))
					 || (hasData && inside)
					) {
						return;
					}
					self.hide();
					preventEmptyAnchor(e);
				},
				clickHandler = e => {
					self.show();
					preventEmptyAnchor(e);
				},
				preventScroll = e => (e.code === 'ArrowUp' || e.code === 'ArrowDown') && e.preventDefault(),
				keyHandler = e => {
					let activeItem = doc.activeElement,
						isSameElement = activeItem === element,
						isInsideMenu = menu.contains(activeItem),
						isMenuItem = activeItem.parentNode === menu || activeItem.parentNode.parentNode === menu,
						idx = menuItems.indexOf(activeItem);
					if ( isMenuItem ) {
						idx = isSameElement ? 0
							: e.code === 'ArrowUp' ? (idx>1?idx-1:0)
							: e.code === 'ArrowDown' ? (idx<menuItems.length-1?idx+1:idx) : idx;
						menuItems[idx] && setFocus(menuItems[idx]);
					}
					if ( (menuItems.length && isMenuItem
						|| !menuItems.length && (isInsideMenu || isSameElement)
						|| !isInsideMenu )
						&& element.open && e.code === 'Escape'
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
				element.removeEventListener('click',clickHandler,false);
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
				setTimeout(() => element.Dropdown && element.addEventListener('click',clickHandler,false), 1);
			};
			self.toggle = () => (parent.classList.contains('show') && element.open) ? self.hide() : self.show();
			element.addEventListener('click',clickHandler,false);
			element.open = false;
			element.Dropdown = self;
		},

		Tab: class {
			constructor(element) {
				this.element = element
				element.Tab = this;
				element.addEventListener('click', e => {e.preventDefault();this.show();});
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

})();
