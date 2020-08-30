/*!
	* Native JavaScript for Bootstrap v3.0.10 (https://thednp.github.io/bootstrap.native/)
	* Copyright 2015-2020 © dnp_theme
	* Licensed under MIT (https://github.com/thednp/bootstrap.native/blob/master/LICENSE)
	*/

window.BSN = (() => {
	'use strict';

	const transitionEndEvent = 'transitionend',
		doc = document,
		body = doc.body,
		setFocus = element => element.focus ? element.focus() : element.setActive();

	function emulateTransitionEnd(element,handler) {
		var called = 0, duration = parseFloat(getComputedStyle(element).transitionDuration),
			transitionEndWrapper = e => {
				!called && handler(e), called = 1;
				element.removeEventListener( transitionEndEvent, transitionEndWrapper);
			};
		(isFinite(duration) && duration)
			? element.addEventListener( transitionEndEvent, transitionEndWrapper )
			: setTimeout(() => { !called && handler(), called = 1; }, 17);
	}

	function Dropdown(element) {
		var self = this,
			parent, menu, menuItems = [];
		function preventEmptyAnchor(ev, anchor) {
			const p = anchor.parentNode;
			((anchor.href && anchor.href.slice(-1) === '#') || (p && p.href && p.href.slice(-1) === '#'))
			&& ev.preventDefault();
		}
		function toggleEvents() {
			let action = element.open ? 'addEventListener' : 'removeEventListener';
			doc[action]('click',dismissHandler,false);
			doc[action]('keydown',preventScroll,false);
			doc[action]('keyup',keyHandler,false);
			doc[action]('focus',dismissHandler,false);
		}
		function dismissHandler(e) {
			let eventTarget = e.target,
				hasData = eventTarget && (eventTarget.getAttribute('data-toggle')
					|| (eventTarget.parentNode && eventTarget.parentNode.getAttribute('data-toggle')));
			if ( e.type === 'focus' && (eventTarget === element || eventTarget === menu || menu.contains(eventTarget) ) ) {
				return;
			}
			if ( hasData && (eventTarget === menu || menu.contains(eventTarget)) ) { return; }
			self.hide();
			preventEmptyAnchor(e,eventTarget);
		}
		function clickHandler(e) {
			self.show();
			preventEmptyAnchor(e,e.target);
		}
		function preventScroll(e) {
			( e.code === 'ArrowUp' || e.code === 'ArrowDown' ) && e.preventDefault();
		}
		function keyHandler(e) {
			var activeItem = doc.activeElement,
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
		}
		self.show = () => {
			menu = parent.querySelector('.dropdown-menu');
			menuItems = [];
			Array.from(menu.children).forEach(child => {
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
		parent = element.parentNode;
		element.addEventListener('click',clickHandler,false);
		element.open = false;
		element.Dropdown = self;
	}

	function Modal(modal) {
		var scrollBarWidth;
		function setScrollbar() {
			var openModal = body.classList.contains('modal-open'),
				bodyPad = parseInt(getComputedStyle(body).paddingRight),
				bodyOverflow = doc.documentElement.clientHeight !== doc.documentElement.scrollHeight
					|| body.clientHeight !== body.scrollHeight,
				modalOverflow = modal.clientHeight !== modal.scrollHeight;
			scrollBarWidth = measureScrollbar();
			modal.style.paddingRight = !modalOverflow && scrollBarWidth ? scrollBarWidth + "px" : '';
			body.style.paddingRight = modalOverflow || bodyOverflow
				? (bodyPad + (openModal ? 0:scrollBarWidth)) + "px"
				: '';
		}
		function resetScrollbar() {
			body.style.paddingRight = '';
			modal.style.paddingRight = '';
		}
		function measureScrollbar() {
			var scrollDiv = doc.createElement('div'), widthValue;
			scrollDiv.className = 'modal-scrollbar-measure';
			body.appendChild(scrollDiv);
			widthValue = scrollDiv.offsetWidth - scrollDiv.clientWidth;
			body.removeChild(scrollDiv);
			return widthValue;
		}
		function toggleEvents(action) {
			window[action ? 'addEventListener' : 'removeEventListener']( 'resize',
				() => modal.classList.contains('show') && setScrollbar(), { passive: true });
		}
		function beforeShow() {
			modal.style.display = 'block';
			setScrollbar();
			!doc.getElementsByClassName('modal show')[0] && body.classList.add('modal-open');
			modal.classList.add('show');
			modal.setAttribute('aria-hidden', false);
			modal.classList.contains('fade') ? emulateTransitionEnd(modal, triggerShow) : triggerShow();
		}
		function triggerShow() {
			setFocus(modal);
			modal.isAnimating = false;
			toggleEvents(1);
		}
		function triggerHide() {
			modal.style.display = '';
			body.classList.remove('modal-open');
			resetScrollbar();
			toggleEvents();
			modal.isAnimating = false;
		}
		this.show = () => {
			if (!modal.classList.contains('show') || !modal.isAnimating) {
				modal.isAnimating = true;
				doc.getElementsByClassName('modal show')[0] ? beforeShow() : setTimeout( beforeShow, 0 );
			}
		};
		this.hide = () => {
			if (modal.classList.contains('show') ) {
				modal.isAnimating = true;
				modal.classList.remove('show');
				modal.setAttribute('aria-hidden', true);
				modal.classList.contains('fade') ? emulateTransitionEnd(modal, triggerHide) : triggerHide();
			}
		};
		modal.isAnimating = false;
		modal.Modal = this;
	}

	class Tab {
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

	return {
		Dropdown: Dropdown,
		Modal: Modal,
		Tab: Tab
	};

})();
