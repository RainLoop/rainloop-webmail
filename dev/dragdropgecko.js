/**
 * Modified version of https://github.com/Bernardo-Castilho/dragdroptouch
 * This is to only support Firefox Mobile.
 * Because touchstart must call preventDefault() to prevent scrolling
 * but then it doesn't work native in Chrome on Android
 */

(doc => {
	let ua = navigator.userAgent.toLowerCase();
	// Chrome on mobile supports drag & drop
	if (ua.includes('mobile') && ua.includes('gecko/')) {

		let opt = { passive: false, capture: false },

			dropEffect = 'move',
			effectAllowed = 'all',
			data = {},

			dataTransfer,
			dragSource,
			isDragging,
			allowDrop,
			lastTarget,
			lastTouch,
			holdInterval,

			img;

/*
		class DataTransferItem
		{
			get kind() { return 'string'; }
		}
*/
		/** https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer */
		class DataTransfer
		{
			get dropEffect() { return dropEffect; }
			set dropEffect(value) { dropEffect = value; }

			get effectAllowed() { return effectAllowed; }
			set effectAllowed(value) { effectAllowed = value; }

			get files() { return []; }
			get items() { return []; } // DataTransferItemList
			get types() { return Object.keys(data); }

			clearData(type) {
				if (type != null) {
					delete data[type];
				} else {
					data = {};
				}
			}

			getData(type) {
				return data[type] || '';
			}

			setData(type, value) {
				data[type] = value;
			}

			constructor() {
				this.setDragImage = setDragImage;
			}
		}

		const
		htmlDrag = b => doc.documentElement.classList.toggle('firefox-drag', b),

		setDragImage = (src, xOffset, yOffset) => {
			img && img.remove();
			if (src) {
				// create drag image from custom element or drag source
				img = src.cloneNode(true);
				copyStyle(src, img);
				img._x = xOffset == null ? src.clientWidth / 2 : xOffset;
				img._y = yOffset == null ? src.clientHeight / 2 : yOffset;
			}
		},

		// clear all members
		reset = () => {
			if (dragSource) {
				clearInterval(holdInterval);
				// dispose of drag image element
				img && img.remove();
				isDragging && dispatchEvent(lastTouch, 'dragend', dragSource);
				img = dragSource = lastTouch = lastTarget = dataTransfer = holdInterval = null;
				isDragging = allowDrop = false;
				htmlDrag(false);
			}
		},

		// get point for a touch event
		getPoint = e => {
			e = e.touches ? e.touches[0] : e;
			return { x: e.clientX, y: e.clientY };
		},

		touchend = e => {
			if (dragSource) {
				// finish dragging
				allowDrop && 'touchcancel' !== e.type && dispatchEvent(lastTouch, 'drop', lastTarget);
				reset();
			}
		},

		// get the element at a given touch event
		getTarget = pt => {
			let el = doc.elementFromPoint(pt.x, pt.y);
			while (el && getComputedStyle(el).pointerEvents == 'none') {
				el = el.parentElement;
			}
			return el;
		},

		// move the drag image element
		moveImage = pt => {
			requestAnimationFrame(() => {
				if (img) {
					img.style.left = Math.round(pt.x - img._x) + 'px';
					img.style.top = Math.round(pt.y - img._y) + 'px';
				}
			});
		},

		copyStyle = (src, dst) => {
			// remove potentially troublesome attributes
			['id','class','style','draggable'].forEach(att => dst.removeAttribute(att));
			// copy canvas content
			if (src instanceof HTMLCanvasElement) {
				let cSrc = src, cDst = dst;
				cDst.width = cSrc.width;
				cDst.height = cSrc.height;
				cDst.getContext('2d').drawImage(cSrc, 0, 0);
			}
			// copy style (without transitions)
			let cs = getComputedStyle(src);
			Object.entries(cs).forEach(([key, value]) => key.includes('transition') || (dst.style[key] = value));
			dst.style.pointerEvents = 'none';
			// and repeat for all children
			let i = src.children.length;
			while (i--) copyStyle(src.children[i], dst.children[i]);
		},

		// return false when cancelled
		dispatchEvent = (e, type, target) => {
			if (e && target) {
				let evt = new Event(type, {bubbles:true,cancelable:true});
				evt.button = 0;
				evt.buttons = 1;
				// copy event properties into new event
				['altKey','ctrlKey','metaKey','shiftKey'].forEach(k => evt[k] = e[k]);
				let src = e.touches ? e.touches[0] : e;
				['pageX','pageY','clientX','clientY','screenX','screenY','offsetX','offsetY'].forEach(k => evt[k] = src[k]);
				if (dragSource) {
					evt.dataTransfer = dataTransfer;
				}
				return target.dispatchEvent(evt);
			}
			return false;
		};

		doc.addEventListener('touchstart', e => {
			// clear all variables
			reset();
			// ignore events that have been handled or that involve more than one touch
			if (e && !e.defaultPrevented && e.touches && e.touches.length < 2) {
				// get nearest draggable element
				dragSource = e.target.closest('[draggable]');
				if (dragSource) {
					// get ready to start dragging
					lastTouch = e;
//					dragSource.style.userSelect = 'none';

					// 1000 ms to wait, chrome on android triggers dragstart in 600
					holdInterval = setTimeout(() => {
						// start dragging
						dataTransfer = new DataTransfer();
						if ((isDragging = dispatchEvent(e, 'dragstart', dragSource))) {
							htmlDrag(true);

							let pt = getPoint(e);

							// create drag image from custom element or drag source
							img || setDragImage(dragSource);
							let style = img.style;
							style.top = style.left = '-9999px';
							style.position = 'fixed';
							style.pointerEvents = 'none';
							style.zIndex = '999999999';
							// add image to document
							moveImage(pt);
							doc.body.append(img);

							dispatchEvent(e, 'dragenter', getTarget(pt));
						} else {
							reset();
						}
					}, 1000);
				}
			}
		}, opt);

		doc.addEventListener('touchmove', e => {
			if (isDragging) {
				// continue dragging
				let pt = getPoint(e),
					target = getTarget(pt);
				lastTouch = e;
				if (target != lastTarget) {
					dispatchEvent(e, 'dragleave', lastTarget);
					dispatchEvent(e, 'dragenter', target);
					lastTarget = target;
				}
				moveImage(pt);
				allowDrop = !dispatchEvent(e, 'dragover', target);
			} else {
				reset();
			}
		}, opt);

		doc.addEventListener('touchend', touchend);
		doc.addEventListener('touchcancel', touchend);
	}

})(document);
