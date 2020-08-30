/*!
	* Native JavaScript for Bootstrap v3.0.10 (https://thednp.github.io/bootstrap.native/)
	* Copyright 2015-2020 © dnp_theme
	* Licensed under MIT (https://github.com/thednp/bootstrap.native/blob/master/LICENSE)
	*/

window.BSN = (() => {
	'use strict';

	const transitionEndEvent = 'transitionend',
		doc = document,
		body = doc.body;

	function getElementTransitionDuration(element) {
		var duration = parseFloat(getComputedStyle(element).transitionDuration);
		duration = typeof duration === 'number' && !isNaN(duration) ? duration * 1000 : 0;
		return duration;
	}

	function emulateTransitionEnd(element,handler){
		var called = 0, duration = getElementTransitionDuration(element);
		duration ? element.addEventListener( transitionEndEvent, function transitionEndWrapper(e){
				!called && handler(e), called = 1;
				element.removeEventListener( transitionEndEvent, transitionEndWrapper);
			})
		 : setTimeout(() => { !called && handler(), called = 1; }, 17);
	}

	function queryElement(selector, parent) {
		var lookUp = parent && parent instanceof Element ? parent : doc;
		return selector instanceof Element ? selector : lookUp.querySelector(selector);
	}

	function setFocus (element){
		element.focus ? element.focus() : element.setActive();
	}

	function Dropdown(element) {
		var self = this,
			parent, menu, menuItems = [];
		function preventEmptyAnchor(anchor) {
			(anchor.href && anchor.href.slice(-1) === '#' || anchor.parentNode && anchor.parentNode.href
				&& anchor.parentNode.href.slice(-1) === '#') && this.preventDefault();
		}
		function toggleDismiss() {
			var action = element.open ? 'addEventListener' : 'removeEventListener';
			doc[action]('click',dismissHandler,false);
			doc[action]('keydown',preventScroll,false);
			doc[action]('keyup',keyHandler,false);
			doc[action]('focus',dismissHandler,false);
		}
		function dismissHandler(e) {
			var eventTarget = e.target,
				hasData = eventTarget && (eventTarget.getAttribute('data-toggle')
					|| eventTarget.parentNode && eventTarget.parentNode.getAttribute
					&& eventTarget.parentNode.getAttribute('data-toggle'));
			if ( e.type === 'focus' && (eventTarget === element || eventTarget === menu || menu.contains(eventTarget) ) ) {
				return;
			}
			if ( hasData && (eventTarget === menu || menu.contains(eventTarget)) ) { return; }
			self.hide();
			preventEmptyAnchor.call(e,eventTarget);
		}
		function clickHandler(e) {
			self.show();
			preventEmptyAnchor.call(e,e.target);
		}
		function preventScroll(e) {
			var key = e.which || e.keyCode;
			if( key === 38 || key === 40 ) { e.preventDefault(); }
		}
		function keyHandler(e) {
			var key = e.which || e.keyCode,
				activeItem = doc.activeElement,
				isSameElement = activeItem === element,
				isInsideMenu = menu.contains(activeItem),
				isMenuItem = activeItem.parentNode === menu || activeItem.parentNode.parentNode === menu,
				idx = menuItems.indexOf(activeItem);
			if ( isMenuItem ) {
				idx = isSameElement ? 0
					: key === 38 ? (idx>1?idx-1:0)
					: key === 40 ? (idx<menuItems.length-1?idx+1:idx) : idx;
				menuItems[idx] && setFocus(menuItems[idx]);
			}
			if ( (menuItems.length && isMenuItem
				|| !menuItems.length && (isInsideMenu || isSameElement)
				|| !isInsideMenu )
				&& element.open && key === 27
			) {
				self.toggle();
			}
		}
		self.show = () => {
			menu.classList.add('show');
			parent.classList.add('show');
			element.setAttribute('aria-expanded',true);
			element.open = true;
			element.removeEventListener('click',clickHandler,false);
			setTimeout(() => {
				setFocus( menu.getElementsByTagName('INPUT')[0] || element );
				toggleDismiss();
			},1);
		};
		self.hide = () => {
			menu.classList.remove('show');
			parent.classList.remove('show');
			element.setAttribute('aria-expanded',false);
			element.open = false;
			toggleDismiss();
			setFocus(element);
			setTimeout(() => element.Dropdown && element.addEventListener('click',clickHandler,false), 1);
		};
		self.toggle = () => (parent.classList.contains('show') && element.open) ? self.hide() : self.show();
		parent = element.parentNode;
		menu = queryElement('.dropdown-menu', parent);
		Array.from(menu.children).forEach(child => {
			child.children.length && (child.children[0].tagName === 'A' && menuItems.push(child.children[0]));
			child.tagName === 'A' && menuItems.push(child);
		});
		if ( !element.Dropdown ) {
			!('tabindex' in menu) && menu.setAttribute('tabindex', '0');
			element.addEventListener('click',clickHandler,false);
		}
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
			action = action ? 'addEventListener' : 'removeEventListener';
			window[action]( 'resize', () => modal.classList.contains('show') && setScrollbar(), { passive: true });
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
				queryElement(previous.getAttribute('href')).classList.remove('active');
				li.classList.add('active');
				queryElement(el.getAttribute('href')).classList.add('active');
			}
		}
	}

	return {
		Dropdown: Dropdown,
		Modal: Modal,
		Tab: Tab
	};

})();
