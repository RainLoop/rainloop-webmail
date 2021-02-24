/**
 * Modified version of https://github.com/Bernardo-Castilho/dragdroptouch
 * This is to only support Firefox Mobile.
 * Because touchstart must call preventDefault() to prevent scrolling
 * but then it doesn't work native in Chrome on Android
 */

(doc => {
	let ua = navigator.userAgent.toLowerCase(),

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

		img, imgCustom, imgOffset;

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

		setDragImage(img, xOffset, yOffset) {
			imgCustom = img;
			imgOffset = { x: xOffset, y: yOffset };
		}
	}

	const
	// clear all members
	reset = () => {
		if (dragSource) {
			clearInterval(holdInterval);
			destroyImage();
			isDragging && dispatchEvent(lastTouch, 'dragend', dragSource);
			dragSource = lastTouch = lastTarget = dataTransfer = holdInterval = null;
			isDragging = allowDrop = false;
		}
	},

	// get point for a touch event
	getPoint = e => {
		if (e && e.touches) {
			e = e.touches[0];
		}
		return { x: e.clientX, y: e.clientY };
	},

	touchstart = e => {
		// clear all variables
		reset();
		// ignore events that have been handled or that involve more than one touch
		if (e && !e.defaultPrevented && e.touches && e.touches.length < 2) {
			// get nearest draggable element
			dragSource = e.target.closest('[draggable]');
			if (dragSource) {
				// get ready to start dragging
				lastTouch = e;
//				dragSource.style.userSelect = 'none';

				// 1000 ms to wait, chrome on android triggers dragstart in 600
				holdInterval = setTimeout(() => {
					// start dragging
					dataTransfer = new DataTransfer();
					if ((isDragging = dispatchEvent(e, 'dragstart', dragSource))) {
						createImage(e);
						dispatchEvent(e, 'dragenter', getTarget(e));
					} else {
						reset();
					}
				}, 1000);
			}
		}
	},

	touchmove = e => {
		if (isDragging) {
			// continue dragging
			let target = getTarget(e);
			lastTouch = e;
			e.preventDefault(); // prevent scrolling
			if (target != lastTarget) {
				dispatchEvent(lastTouch, 'dragleave', lastTarget);
				dispatchEvent(e, 'dragenter', target);
				lastTarget = target;
			}
			moveImage(e);
			allowDrop = !dispatchEvent(e, 'dragover', target);
		} else {
			reset();
		}
	},

	touchend = e => {
		if (dragSource) {
			// finish dragging
			allowDrop && 'touchcancel' !== e.type && dispatchEvent(lastTouch, 'drop', lastTarget);
			reset();
		}
	},

	// get the element at a given touch event
	getTarget = e => {
		let pt = getPoint(e), el = doc.elementFromPoint(pt.x, pt.y);
		while (el && getComputedStyle(el).pointerEvents == 'none') {
			el = el.parentElement;
		}
		return el;
	},

	// create drag image from source element
	createImage = e => {
		// just in case...
		destroyImage();
		// create drag image from custom element or drag source
		let src = imgCustom || dragSource;
		img = src.cloneNode(true);
		copyStyle(src, img);
		let style = img.style;
		style.top = style.left = '-9999px';
		style.position = 'fixed';
		style.pointerEvents = 'none';
		style.zIndex = '999999999';
		// if creating from drag source, apply offset and opacity
		if (!imgCustom) {
			imgOffset = { x: src.clientWidth / 2, y: src.clientHeight / 2 };
			style.opacity = 0.75;
		}
		// add image to document
		moveImage(e);
		doc.body.append(img);
	},

	// dispose of drag image element
	destroyImage = () => {
		img && img.remove();
		img = imgCustom = null;
	},

	// move the drag image element
	moveImage = e => {
		requestAnimationFrame(() => {
			if (img) {
				let pt = getPoint(e), s = img.style;
				s.left = Math.round(pt.x - imgOffset.x) + 'px';
				s.top = Math.round(pt.y - imgOffset.y) + 'px';
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
		let cs = getComputedStyle(src), i;
		for (i = 0; i < cs.length; i++) {
			let key = cs[i];
			if (key.indexOf('transition') < 0) {
				dst.style[key] = cs[key];
			}
		}
		dst.style.pointerEvents = 'none';
		// and repeat for all children
		for (i = 0; i < src.children.length; i++) {
			copyStyle(src.children[i], dst.children[i]);
		}
	},

	// return false when cancelled
	dispatchEvent = (e, type, target) => {
		if (e && target) {
			let evt = new Event(type, {bubbles:true,cancelable:true});
			evt.button = 0;
			evt.which = evt.buttons = 1;
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

	// Chrome on mobile supports drag & drop
	if (ua.includes('mobile') && ua.includes('gecko/')) {
		let opt = { passive: false, capture: false };
		doc.addEventListener('touchstart', touchstart, opt);
		doc.addEventListener('touchmove', touchmove, opt);
		doc.addEventListener('touchend', touchend);
		doc.addEventListener('touchcancel', touchend);
	}

})(document);
