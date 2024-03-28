/* Copyright © 2011-2015 by Neil Jenkins. MIT Licensed. */
/* eslint max-len: 0 */

/**
	TODO: modifyBlocks function doesn't work very good.
	For example you have: UL > LI > [cursor here in text]
	Then create blockquote at cursor, the result is: BLOCKQUOTE > UL > LI
	not UL > LI > BLOCKQUOTE
*/

(doc => {

const
	SHOW_ELEMENT = 1,                // NodeFilter.SHOW_ELEMENT,
	SHOW_TEXT = 4,                   // NodeFilter.SHOW_TEXT,
	SHOW_ELEMENT_OR_TEXT = 5,

	// source/Constants.ts
	ELEMENT_NODE = 1,                // Node.ELEMENT_NODE,
	TEXT_NODE = 3,                   // Node.TEXT_NODE,
	DOCUMENT_FRAGMENT_NODE = 11,     // Node.DOCUMENT_FRAGMENT_NODE,
	ZWS = '\u200B',
	ua = navigator.userAgent,
	isMac = /Mac OS X/.test(ua),
	isIOS = /iP(?:ad|hone)/.test(ua) || (isMac && !!navigator.maxTouchPoints),
	isAndroid = /Android/.test(ua),
	isWebKit = /WebKit\//.test(ua),
	ctrlKey = isMac || isIOS ? 'meta-' : 'ctrl-',
	cantFocusEmptyTextNodes = isWebKit,
	// Use [^ \t\r\n] instead of \S so that nbsp does not count as white-space
	notWS = /[^ \t\r\n]/,

	// source/node/Category.ts
//	phrasingElements = 'ABBR,AUDIO,B,BDO,BR,BUTTON,CANVAS,CITE,CODE,COMMAND,DATA,DATALIST,DFN,EM,EMBED,I,IFRAME,IMG,INPUT,KBD,KEYGEN,LABEL,MARK,MATH,METER,NOSCRIPT,OBJECT,OUTPUT,PROGRESS,Q,RUBY,SAMP,SCRIPT,SELECT,SMALL,SPAN,STRONG,SUB,SUP,SVG,TEXTAREA,TIME,VAR,VIDEO,WBR',
	inlineNodeNames = /^(?:#text|A|ABBR|ACRONYM|B|BR|BD[IO]|CITE|CODE|DATA|DEL|DFN|EM|FONT|HR|I|IMG|INPUT|INS|KBD|Q|RP|RT|RUBY|S|SAMP|SMALL|SPAN|STR(IKE|ONG)|SU[BP]|TIME|U|VAR|WBR)$/,
	leafNodeNames = new Set(["BR", "HR", "IMG"]),
	listNodeNames = new Set(["OL", "UL"]),
	UNKNOWN = 0,
	INLINE = 1,
	BLOCK = 2,
	CONTAINER = 3,
	isLeaf = node => isElement(node) && leafNodeNames.has(node.nodeName),
	getNodeCategory = node => {
		switch (node.nodeType) {
		case TEXT_NODE:
			return INLINE;
		case ELEMENT_NODE:
		case DOCUMENT_FRAGMENT_NODE:
			if (nodeCategoryCache.has(node)) {
				return nodeCategoryCache.get(node);
			}
			break;
		default:
			return UNKNOWN;
		}

		let nodeCategory =
			Array.prototype.every.call(node.childNodes, isInline)
			? (inlineNodeNames.test(node.nodeName) ? INLINE : BLOCK)
			// Malformed HTML can have block tags inside inline tags. Need to treat
			// these as containers rather than inline. See #239.
			: CONTAINER;
		nodeCategoryCache.set(node, nodeCategory);
		return nodeCategory;
	},
	isInline = node => getNodeCategory(node) === INLINE,
	isBlock = node => getNodeCategory(node) === BLOCK,
	isContainer = node => getNodeCategory(node) === CONTAINER,

	// source/node/Node.ts
	createElement = (tag, props, children) => {
		const el = doc.createElement(tag);
		if (props instanceof Array) {
			children = props;
			props = null;
		}
		setAttributes(el, props);
		children && el.append(...children);
		return el;
	},
	areAlike = (node, node2) => {
		return !isLeaf(node) && (
			node.nodeType === node2.nodeType &&
			node.nodeName === node2.nodeName &&
			node.nodeName !== "A" &&
			node.className === node2.className &&
			node.style?.cssText === node2.style?.cssText
		);
	},
	hasTagAttributes = (node, tag, attributes) => {
		return node.nodeName === tag && Object.entries(attributes || {}).every(([k,v]) => node.getAttribute(k) === v);
	},
	getNearest = (node, root, tag, attributes) => {
		while (node && node !== root) {
			if (hasTagAttributes(node, tag, attributes)) {
				return node;
			}
			node = node.parentNode;
		}
		return null;
	},
	getNodeBefore = (node, offset) => {
		let children = node.childNodes;
		while (offset && isElement(node)) {
			node = children[offset - 1];
			children = node.childNodes;
			offset = children.length;
		}
		return node;
	},
	getNodeAfterOffset = (node, offset) => {
		if (isElement(node)) {
			const children = node.childNodes;
			if (offset < children.length) {
				node = children[offset];
			} else {
				while (node && !node.nextSibling) {
					node = node.parentNode;
				}
				node && (node = node.nextSibling);
			}
		}
		return node;
	},
	getLength = node =>
		isElement(node) || node instanceof DocumentFragment ? node.childNodes.length : node.length || 0,
	empty = node => {
		const frag = doc.createDocumentFragment(),
			childNodes = node.childNodes;
		childNodes && frag.append(...childNodes);
		return frag;
	},
	detach = node => {
//		node.remove();
		node.parentNode?.removeChild(node);
	},
	getClosest = (node, root, selector) => {
		node = (node && !node.closest) ? node.parentElement : node;
		node = node?.closest(selector);
		return (node && root.contains(node)) ? node : null;
	},

	// source/node/Whitespace.ts
	notWSTextNode = node => isElement(node) ? isBrElement(node) : notWS.test(node.data),
	isLineBreak = (br, isLBIfEmptyBlock) => {
		let walker, block = br.parentNode;
		while (isInline(block)) {
			block = block.parentNode;
		}
		walker = createTreeWalker(block, SHOW_ELEMENT_OR_TEXT, notWSTextNode);
		walker.currentNode = br;
		return !!walker.nextNode() || (isLBIfEmptyBlock && !walker.previousNode());
	},
	// --- Workaround for browsers that can't focus empty text nodes ---
	// WebKit bug: https://bugs.webkit.org/show_bug.cgi?id=15256
	// Walk down the tree starting at the root and remove any ZWS. If the node only
	// contained ZWS space then remove it too. We may want to keep one ZWS node at
	// the bottom of the tree so the block can be selected. Define that node as the
	// keepNode.
	removeZWS = (root, keepNode) => {
		const walker = createTreeWalker(root, SHOW_TEXT);
		let parent, node, index;
		while (node = walker.nextNode()) {
			while ((index = node.data.indexOf(ZWS)) > -1  && (!keepNode || node.parentNode !== keepNode)) {
				if (node.length === 1) {
					do {
						parent = node.parentNode;
						node.remove();
						node = parent;
						walker.currentNode = parent;
					} while (isInline(node) && !getLength(node));
					break;
				} else {
					node.deleteData(index, 1);
				}
			}
		}
	},

	// source/range/Boundaries.ts
	START_TO_START = 0, // Range.START_TO_START
	START_TO_END = 1,   // Range.START_TO_END
	END_TO_END = 2,     // Range.END_TO_END
	END_TO_START = 3,   // Range.END_TO_START
	isNodeContainedInRange = (range, node, partial = true) => {
		const nodeRange = doc.createRange();

		nodeRange.selectNode(node);

		return partial
			// Node must not finish before range starts or start after range finishes.
			? range.compareBoundaryPoints(END_TO_START, nodeRange) < 0
				&& range.compareBoundaryPoints(START_TO_END, nodeRange) > 0
			// Node must start after range starts and finish before range finishes
			: range.compareBoundaryPoints(START_TO_START, nodeRange) < 1
				&& range.compareBoundaryPoints(END_TO_END, nodeRange) > -1;
	},
	moveRangeBoundariesDownTree = range => {
		let { startContainer, startOffset, endContainer, endOffset } = range;
		let child;

		while (!isTextNode(startContainer)) {
			child = startContainer.childNodes[startOffset];
			if (!child || isLeaf(child)) {
				if (startOffset) {
					child = startContainer.childNodes[startOffset - 1];
					if (isTextNode(child)) {
						let textChild = child;
						let prev;
						while (!textChild.length && (prev = textChild.previousSibling) && isTextNode(prev)) {
							textChild.remove();
							textChild = prev;
						}
						startContainer = textChild;
						startOffset = textChild.data.length;
					}
				}
				break;
			}
			startContainer = child;
			startOffset = 0;
		}
		if (endOffset) {
			while (!isTextNode(endContainer)) {
				child = endContainer.childNodes[endOffset - 1];
				if (!child || isLeaf(child)) {
					if (isBrElement(child) && !isLineBreak(child)) {
						--endOffset;
						continue;
					}
					break;
				}
				endContainer = child;
				endOffset = getLength(endContainer);
			}
		} else {
			while (!isTextNode(endContainer)) {
				child = endContainer.firstChild;
				if (!child || isLeaf(child)) {
					break;
				}
				endContainer = child;
			}
		}

		range.setStart(startContainer, startOffset);
		range.setEnd(endContainer, endOffset);
	},
	moveRangeBoundariesUpTree = (range, startMax, endMax, root) => {
		let startContainer = range.startContainer;
		let startOffset = range.startOffset;
		let endContainer = range.endContainer;
		let endOffset = range.endOffset;
		let parent;

		if (!startMax) {
			startMax = range.commonAncestorContainer;
		}
		if (!endMax) {
			endMax = startMax;
		}

		while (!startOffset && startContainer !== startMax && startContainer !== root) {
			parent = startContainer.parentNode;
			startOffset = indexOf(parent.childNodes, startContainer);
			startContainer = parent;
		}

		while (endContainer !== endMax && endContainer !== root) {
			if (!isTextNode(endContainer) && isBrElement(endContainer.childNodes[endOffset]) && !isLineBreak(endContainer.childNodes[endOffset])) {
				++endOffset;
			}
			if (endOffset !== getLength(endContainer)) {
				break;
			}
			parent = endContainer.parentNode;
			endOffset = indexOf(parent.childNodes, endContainer) + 1;
			endContainer = parent;
		}

		range.setStart(startContainer, startOffset);
		range.setEnd(endContainer, endOffset);
	},
	moveRangeBoundaryOutOf = (range, tag, root) => {
		let parent = getClosest(range.endContainer, root, tag);
		if (parent && (parent = parent.parentNode)) {
			const clone = range.cloneRange();
			moveRangeBoundariesUpTree(clone, parent, parent, root);
			if (clone.endContainer === parent) {
				range.setStart(clone.endContainer, clone.endOffset);
				range.setEnd(clone.endContainer, clone.endOffset);
			}
		}
		return range;
	},

	// source/node/MergeSplit.ts
	fixCursor = (node) => {
		let fixer = null;
		if (!isTextNode(node)) {
			if (isInline(node)) {
				let child = node.firstChild;
				if (cantFocusEmptyTextNodes) {
					while (child && isTextNode(child) && !child.data) {
						node.removeChild(child);
						child = node.firstChild;
					}
				}
				if (!child) {
					fixer = doc.createTextNode(cantFocusEmptyTextNodes ? ZWS : "");
				}
			} else if (isElement(node) && !node.querySelector("BR")) {
				fixer = createElement("BR");
			}
			if (fixer) {
				try {
					node.appendChild(fixer);
				} catch (error) {
					didError({
						name: 'Squire: fixCursor – ' + error,
						message: 'Parent: ' + node.nodeName + '/' + node.innerHTML +
							' appendChild: ' + fixer.nodeName
					});
				}
			}
		}
		return node;
	},
	// Recursively examine container nodes and wrap any inline children.
	fixContainer = (container, root) => {
		let wrapper, isBR;
		// Not live, and fast
		[...container.childNodes].forEach(child => {
			isBR = isBrElement(child);
			if (!isBR && child.parentNode == root && isInline(child)
//			 && (blockTag !== "DIV" || (child.matches && !child.matches(phrasingElements)))
			) {
				wrapper = wrapper || createElement("DIV");
				wrapper.append(child);
			} else if (isBR || wrapper) {
				wrapper = wrapper || createElement("DIV");
				fixCursor(wrapper);
				child[isBR ? "replaceWith" : "before"](wrapper);
				wrapper = null;
			}
			isContainer(child) && fixContainer(child, root);
		});
		wrapper && container.append(fixCursor(wrapper));
		return container;
	},
	split = (node, offset, stopNode, root) => {
		if (isTextNode(node) && node !== stopNode) {
			if (typeof offset !== "number") {
				throw new Error("Offset must be a number to split text node!");
			}
			if (!node.parentNode) {
				throw new Error("Cannot split text node with no parent!");
			}
			return split(node.parentNode, node.splitText(offset), stopNode, root);
		}
		let nodeAfterSplit = typeof offset === "number" ? offset < node.childNodes.length ? node.childNodes[offset] : null : offset;
		const parent = node.parentNode;
		if (!parent || node === stopNode || !isElement(node)) {
			return nodeAfterSplit;
		}
		const clone = node.cloneNode(false);
		while (nodeAfterSplit) {
			const next = nodeAfterSplit.nextSibling;
			clone.append(nodeAfterSplit);
			nodeAfterSplit = next;
		}
		if (node instanceof HTMLOListElement && getClosest(node, root, "BLOCKQUOTE")) {
			clone.start = (+node.start || 1) + node.childNodes.length - 1;
		}
		fixCursor(node);
		fixCursor(clone);
		node.after(clone);
		return split(parent, clone, stopNode, root);
	},
	_mergeInlines = (node, fakeRange) => {
		const children = node.childNodes;
		let l = children.length;
		let frags = [];
		let child, prev;
		while (l--) {
			child = children[l];
			prev = l && children[l - 1];
			if (prev && isInline(child) && areAlike(child, prev)/* && !leafNodeNames.has(child.nodeName)*/) {
				if (fakeRange.startContainer === child) {
					fakeRange.startContainer = prev;
					fakeRange.startOffset += getLength(prev);
				}
				if (fakeRange.endContainer === child) {
					fakeRange.endContainer = prev;
					fakeRange.endOffset += getLength(prev);
				}
				if (fakeRange.startContainer === node) {
					if (fakeRange.startOffset > l) {
						--fakeRange.startOffset;
					} else if (fakeRange.startOffset === l) {
						fakeRange.startContainer = prev;
						fakeRange.startOffset = getLength(prev);
					}
				}
				if (fakeRange.endContainer === node) {
					if (fakeRange.endOffset > l) {
						--fakeRange.endOffset;
					} else if (fakeRange.endOffset === l) {
						fakeRange.endContainer = prev;
						fakeRange.endOffset = getLength(prev);
					}
				}
				detach(child);
				if (isTextNode(child)) {
					prev.appendData(child.data);
				} else {
					frags.unshift(empty(child));
				}
			} else if (isElement(child)) {
				child.append(...frags);
				frags = [];
				_mergeInlines(child, fakeRange);
			}
		}
	},
	mergeInlines = (node, range) => {
		node = isTextNode(node) ? node.parentNode : node;
		if (isElement(node)) {
			const fakeRange = {
				startContainer: range.startContainer,
				startOffset: range.startOffset,
				endContainer: range.endContainer,
				endOffset: range.endOffset
			};
			_mergeInlines(node, fakeRange);
			range.setStart(fakeRange.startContainer, fakeRange.startOffset);
			range.setEnd(fakeRange.endContainer, fakeRange.endOffset);
		}
	},
	mergeWithBlock = (block, next, range, root) => {
		let container = next;
		let parent;
		let offset;
		while ((parent = container.parentNode) && parent !== root && isElement(parent) && parent.childNodes.length === 1) {
			container = parent;
		}
		detach(container);
		offset = block.childNodes.length;
		// Remove extra <BR> fixer if present.
		const last = block.lastChild;
		if (isBrElement(last)) {
			last.remove();
			--offset;
		}
		block.append(empty(next));
		range.setStart(block, offset);
		range.collapse(true);
		mergeInlines(block, range);
	},
	mergeContainers = (node, root) => {
		const prev = node.previousSibling;
		const first = node.firstChild;
		const isListItem = node.nodeName === "LI";
		// Do not merge LIs, unless it only contains a UL
		if (isListItem && (!first || !listNodeNames.has(first.nodeName))) {
			return;
		}
		let needsFix, block;
		if (prev && areAlike(prev, node)) {
			if (!isContainer(prev)) {
				if (!isListItem) {
					return;
				}
				block = createElement("DIV");
				block.append(empty(prev));
				prev.append(block);
			}
			detach(node);
			needsFix = !isContainer(node);
			prev.append(empty(node));
			if (needsFix) {
				fixContainer(prev, root);
			}
			if (first) {
				mergeContainers(first, root);
			}
		} else if (isListItem) {
			block = createElement("DIV");
			node.insertBefore(block, first);
			fixCursor(block);
		}
	},

	// source/Clean.ts
	styleToSemantic = {
		fontWeight: {
			regexp: /^bold|^700/i,
			replace: () => createElement("B")
		},
		fontStyle: {
			regexp: /^italic/i,
			replace: () => createElement("I")
		},
		fontFamily: {
			regexp: notWS,
			replace: (doc, family) => createElement("SPAN", {
				style: 'font-family:' + family
			})
		},
		fontSize: {
			regexp: notWS,
			replace: (doc, size) => createElement("SPAN", {
				style: 'font-size:' + size
			})
		},
		textDecoration: {
			regexp: /^underline/i,
			replace: () => createElement("U")
		}
	/*
		textDecoration: {
			regexp: /^line-through/i,
			replace: doc => createElement("S")
		}
	*/
	},
	replaceStyles = node => {
		const style = node.style;
		let newTreeBottom, newTreeTop, css, el;
		Object.entries(styleToSemantic).forEach(([attr,converter])=>{
			css = style[attr];
			if (css && converter.regexp.test(css)) {
				el = converter.replace(doc, css);
				if (el.nodeName === node.nodeName && el.className === node.className) {
					return;
				}
				if (!newTreeTop) {
					newTreeTop = el;
				}
				if (newTreeBottom) {
					newTreeBottom.append(el);
				}
				newTreeBottom = el;
				node.style[attr] = '';
			}
		});
		if (newTreeTop && newTreeBottom) {
			newTreeBottom.append(empty(node));
			if (node.style.cssText) {
				node.append(newTreeTop);
			} else {
				node.replaceWith(newTreeTop);
			}
		}
		return newTreeBottom || node;
	},
	replaceWithTag = tag => node => {
		let el = createElement(tag);
		Array.prototype.forEach.call(node.attributes, attr => el.setAttribute(attr.name, attr.value));
		node.replaceWith(el);
		el.append(empty(node));
		return el;
	},
	fontSizes = {
		1: 'x-small',
		2: "small",
		3: "medium",
		4: "large",
		5: 'x-large',
		6: 'xx-large',
		7: 'xxx-large',
		'-1': "smaller",
		'+1': "larger"
	},
	stylesRewriters = {
		STRONG: replaceWithTag("B"),
		EM: replaceWithTag("I"),
		INS: replaceWithTag("U"),
		STRIKE: replaceWithTag("S"),
		SPAN: replaceStyles,
		FONT: node => {
			const face = node.face;
			const size = node.size;
			let color = node.color;
			let newTag = createElement("SPAN");
			let css = newTag.style;
			newTag.style.cssText = node.style.cssText;
			if (face) {
				css.fontFamily = face;
			}
			if (size) {
				css.fontSize = fontSizes[size];
			}
			if (color && /^#?([\dA-F]{3}){1,2}$/i.test(color)) {
				if (color.charAt(0) !== "#") {
					color = "#" + color;
				}
				css.color = color;
			}
			node.replaceWith(newTag);
			newTag.append(empty(node));
			return newTag;
		},
	//	KBD:
	//	VAR:
	//	CODE:
	//	SAMP:
		TT: node => {
			let el = createElement("SPAN", {
				style: 'font-family:menlo,consolas,"courier new",monospace'
			});
			node.replaceWith(el);
			el.append(empty(node));
			return el;
		}
	},
	allowedBlock = /^(?:A(?:DDRESS|RTICLE|SIDE|UDIO)|BLOCKQUOTE|CAPTION|D(?:[DLT]|IV)|F(?:IGURE|IGCAPTION|OOTER)|H[1-6]|HEADER|L(?:ABEL|EGEND|I)|O(?:L|UTPUT)|P(?:RE)?|SECTION|T(?:ABLE|BODY|D|FOOT|H|HEAD|R)|COL(?:GROUP)?|UL)$/,
	blacklist = new Set(["HEAD", "META", "STYLE"]),
	/*
		Two purposes:

		1. Remove nodes we don't want, such as weird <o:p> tags, comment nodes
		   and whitespace nodes.
		2. Convert inline tags into our preferred format.
	*/
	cleanTree = (node, preserveWS) => {
		const children = node.childNodes;
		let nonInlineParent, i = children.length, child, nodeName, childLength;
//			startsWithWS, endsWithWS, data, sibling;

		nonInlineParent = node;
		while (isInline(nonInlineParent)) {
			nonInlineParent = nonInlineParent.parentNode;
		}
//		const walker = createTreeWalker(nonInlineParent, SHOW_ELEMENT_OR_TEXT);

		while (i--) {
			child = children[i];
			nodeName = child.nodeName;
			if (isElement(child)) {
				childLength = child.childNodes.length;
				if (stylesRewriters[nodeName]) {
					child = stylesRewriters[nodeName](child);
				} else if (blacklist.has(nodeName)) {
					child.remove();
					continue;
				} else if (!allowedBlock.test(nodeName) && !isInline(child)) {
					i += childLength;
					child.replaceWith(empty(child));
					continue;
				}
				if (childLength) {
					cleanTree(child, preserveWS || (nodeName === "PRE"));
				}
/*
			} else {
				if (isTextNode(child)) {
					data = child.data;
					startsWithWS = !notWS.test(data.charAt(0));
					endsWithWS = !notWS.test(data.charAt(data.length - 1));
					if (preserveWS || (!startsWithWS && !endsWithWS)) {
						continue;
					}
					// Iterate through the nodes; if we hit some other content
					// before the start of a new block we don't trim
					if (startsWithWS) {
						walker.currentNode = child;
						while (sibling = walker.previousPONode()) {
							nodeName = sibling.nodeName;
							if (nodeName === "IMG" || (nodeName === '#text' && notWS.test(sibling.data))) {
								break;
							}
							if (!isInline(sibling)) {
								sibling = null;
								break;
							}
						}
						data = data.replace(/^[ \r\n]+/g, sibling ? ' ' : '');
					}
					if (endsWithWS) {
						walker.currentNode = child;
						while (sibling = walker.nextNode()) {
							if (nodeName === "IMG" || (nodeName === '#text' && notWS.test(sibling.data))) {
								break;
							}
							if (!isInline(sibling)) {
								sibling = null;
								break;
							}
						}
						data = data.replace(/[ \r\n]+$/g, sibling ? ' ' : '');
					}
					if (data) {
						child.data = data;
						continue;
					}
				}
				child.remove();
*/
			}
		}
		return node;
	},
	removeEmptyInlines = node => {
		const children = node.childNodes;
		let l = children.length,
			child;
		while (l--) {
			child = children[l];
			if (isElement(child) && !isLeaf(child)) {
				removeEmptyInlines(child);
				if (!child.firstChild && isInline(child)) {
					child.remove();
				}
			} else if (isTextNode(child) && !child.data) {
				child.remove();
			}
		}
	},
	// <br> elements are treated specially, and differently depending on the
	// browser, when in rich text editor mode. When adding HTML from external
	// sources, we must remove them, replacing the ones that actually affect
	// line breaks by wrapping the inline text in a <div>. Browsers that want <br>
	// elements at the end of each block will then have them added back in a later
	// fixCursor method call.
	cleanupBRs = (node, root, keepForBlankLine) => {
		const brs = node.querySelectorAll("BR");
		let l = brs.length;
		let br, parent;
		while (l--) {
			br = brs[l];
			// Cleanup may have removed it
			parent = br.parentNode;
			if (parent) {
				// If it doesn't break a line, just remove it; it's not doing
				// anything useful. We'll add it back later if required by the
				// browser. If it breaks a line, wrap the content in div tags
				// and replace the brs.
				if (!isLineBreak(br, keepForBlankLine)) {
					detach(br);
				} else if (!isInline(parent)) {
					fixContainer(parent, root);
				}
			}
		}
	},
	escapeHTML = text => text.replace('&', '&amp;')
		.replace('<', '&lt;')
		.replace('>', '&gt;')
		.replace('"', '&quot;'),

	// source/node/Block.ts
	getBlockWalker = (node, root) => {
		const walker = createTreeWalker(root, SHOW_ELEMENT, isBlock);
		walker.currentNode = node;
		return walker;
	},
	getPreviousBlock = (node, root) => {
//		node = getClosest(node, root, blockElementNames);
		node = getBlockWalker(node, root).previousNode();
		return node !== root ? node : null;
	},
	getNextBlock = (node, root) => {
//		node = getClosest(node, root, blockElementNames);
		node = getBlockWalker(node, root).nextNode();
		return node !== root ? node : null;
	},
	isEmptyBlock = block => !block.textContent && !block.querySelector("IMG"),

	// source/range/Block.ts
	// Returns the first block at least partially contained by the range,
	// or null if no block is contained by the range.
	getStartBlockOfRange = (range, root) => {
		const container = range.startContainer;
		let block;
		if (isInline(container)) {
			block = getPreviousBlock(container, root);
		} else if (container !== root && container instanceof HTMLElement && isBlock(container)) {
			block = container;
		} else {
			block = getNextBlock(getNodeBefore(container, range.startOffset), root);
		}
		return block && isNodeContainedInRange(range, block) ? block : null;
	},
	// Returns the last block at least partially contained by the range,
	// or null if no block is contained by the range.
	getEndBlockOfRange = (range, root) => {
		const container = range.endContainer;
		let block, child;
		if (isInline(container)) {
			block = getPreviousBlock(container, root);
		} else if (container !== root && container instanceof HTMLElement && isBlock(container)) {
			block = container;
		} else {
			block = getNodeAfterOffset(container, range.endOffset);
			if (!block || !root.contains(block)) {
				block = root;
				while (child = block.lastChild) {
					block = child;
				}
			}
			block = getPreviousBlock(block, root);
		}
		return block && isNodeContainedInRange(range, block) ? block : null;
	},
	rangeDoesStartAtBlockBoundary = (range, root) => {
		const startContainer = range.startContainer;
		const startOffset = range.startOffset;
		let nodeAfterCursor;

		// If in the middle or end of a text node, we're not at the boundary.
		if (isTextNode(startContainer)) {
			const text = startContainer.data;
			let i = startOffset;
			while (i--) {
				if (text.charAt(i) !== ZWS) {
					return false;
				}
			}
			nodeAfterCursor = startContainer;
		} else {
			nodeAfterCursor = getNodeAfterOffset(startContainer, startOffset);
			// The cursor was right at the end of the document
			if (!nodeAfterCursor || !root.contains(nodeAfterCursor)) {
				nodeAfterCursor = getNodeBefore(startContainer, startOffset);
				if (isTextNode(nodeAfterCursor) && nodeAfterCursor.length) {
					return false;
				}
			}
		}
		const block = getStartBlockOfRange(range, root);
		if (block) {
			const contentWalker = newContentWalker(block);
			contentWalker.currentNode = nodeAfterCursor;
			return !contentWalker.previousNode();
		}
	},
	rangeDoesEndAtBlockBoundary = (range, root) => {
		const endContainer = range.endContainer;
		const endOffset = range.endOffset;
		let currentNode;
		// If in a text node with content, and not at the end, we're not at the boundary
		if (isTextNode(endContainer)) {
			const text = endContainer.data;
			const length = text.length;
			for (let i = endOffset; i < length; ++i) {
				if (text.charAt(i) !== ZWS) {
					return false;
				}
			}
			currentNode = endContainer;
		} else {
			currentNode = getNodeBefore(endContainer, endOffset);
		}
		const block = getEndBlockOfRange(range, root);
		if (block) {
			const contentWalker = newContentWalker(block);
			contentWalker.currentNode = currentNode;
			return !contentWalker.nextNode();
		}
	},
	expandRangeToBlockBoundaries = (range, root) => {
		const start = getStartBlockOfRange(range, root);
		const end = getEndBlockOfRange(range, root);
//		let parent;
		if (start && end) {
			range.setStart(start, 0);
			range.setEnd(end, end.childNodes.length);
//			parent = start.parentNode;
//			range.setStart(parent, indexOf(parent.childNodes, start));
//			parent = end.parentNode;
//			range.setEnd(parent, indexOf(parent.childNodes, end) + 1);
		}
	},

	// source/range/InsertDelete.ts
	createRange = (startContainer, startOffset, endContainer, endOffset) => {
		const range = doc.createRange();
		range.setStart(startContainer, startOffset);
		if (endContainer && typeof endOffset === "number") {
			range.setEnd(endContainer, endOffset);
		} else {
			range.setEnd(startContainer, startOffset);
		}
		return range;
	},

	insertNodeInRange = (range, node) => {
		let { startContainer, startOffset, endContainer, endOffset } = range;
		let children, parent;

		// If part way through a text node, split it.
		if (isTextNode(startContainer)) {
			parent = startContainer.parentNode;
			children = parent.childNodes;
			if (startOffset === startContainer.length) {
				startOffset = indexOf(children, startContainer) + 1;
				if (range.collapsed) {
					endContainer = parent;
					endOffset = startOffset;
				}
			} else {
				if (startOffset) {
					const afterSplit = startContainer.splitText(startOffset);
					if (endContainer === startContainer) {
						endOffset -= startOffset;
						endContainer = afterSplit;
					} else if (endContainer === parent) {
						++endOffset;
					}
					startContainer = afterSplit;
				}
				startOffset = indexOf(children,
					startContainer
				);
			}
			startContainer = parent;
		} else {
			children = startContainer.childNodes;
		}
		const childCount = children.length;
		if (startOffset === childCount) {
			startContainer.append(node);
		} else {
			startContainer.insertBefore(node, children[startOffset]);
		}
		if (startContainer === endContainer) {
			endOffset += children.length - childCount;
		}
		range.setStart(startContainer, startOffset);
		range.setEnd(endContainer, endOffset);
	},

	extractContentsOfRange = (range, common, root) => {
		common = common || range.commonAncestorContainer;
		if (isTextNode(common)) {
			common = common.parentNode;
		}

		let endNode = split(range.endContainer, range.endOffset, common, root),
			frag = range.extractContents(),
			startContainer = common,
			startOffset = endNode ? indexOf(common.childNodes, endNode) : common.childNodes.length,
			after = common.childNodes[startOffset],
			before = after?.previousSibling,
			beforeText, afterText;

		// Merge text nodes if adjacent.
		if (isTextNode(before) && isTextNode(after)) {
			startContainer = before;
			startOffset = before.length;
			beforeText = before.data;
			afterText = after.data;

			// If we now have two adjacent spaces, the second one needs to become
			// a nbsp, otherwise the browser will swallow it due to HTML whitespace
			// collapsing.
			if (beforeText.charAt(beforeText.length - 1) === ' ' && afterText.charAt(0) === ' ') {
				afterText = NBSP + afterText.slice(1);
			}
			before.appendData(afterText);
			detach(after);
		}

		range.setStart(startContainer, startOffset);
		range.collapse(true);

		fixCursor(common);

		return frag;
	},
	getAdjacentInlineNode = (iterator, method, node) => {
		iterator.currentNode = node;
		let nextNode;
		while (nextNode = iterator[method]()) {
			if (isTextNode(nextNode) || isLeaf(nextNode)) {
				return nextNode;
			}
			if (!isInline(nextNode)) {
				return null;
			}
		}
		return null;
	},
	deleteContentsOfRange = (range, root) => {
		const startBlock = getStartBlockOfRange(range, root);
		let endBlock = getEndBlockOfRange(range, root);
		const needsMerge = startBlock !== endBlock;
		if (startBlock && endBlock) {
			moveRangeBoundariesDownTree(range);
			moveRangeBoundariesUpTree(range, startBlock, endBlock, root);
		}

		// Remove selected range
		const frag = extractContentsOfRange(range, null, root);

		// Move boundaries back down tree as far as possible.
		moveRangeBoundariesDownTree(range);

		// If we split into two different blocks, merge the blocks.
		if (needsMerge) {
			// endBlock will have been split, so need to refetch
			endBlock = getEndBlockOfRange(range, root);
			if (startBlock && endBlock && startBlock !== endBlock) {
				mergeWithBlock(startBlock, endBlock, range, root);
			}
		}

		// Ensure block has necessary children
		if (startBlock) {
			fixCursor(startBlock);
		}

		// Ensure root has a block-level element in it.
		const child = root.firstChild;
		if (!child || isBrElement(child)) {
			fixCursor(root);
			root.firstChild && range.selectNodeContents(root.firstChild);
		}
		range.collapse(true);
		const startContainer = range.startContainer;
		const startOffset = range.startOffset;
		const iterator = newContentWalker(root);
		let afterNode = startContainer;
		let afterOffset = startOffset;
		if (!isTextNode(afterNode) || afterOffset === afterNode.data.length) {
			afterNode = getAdjacentInlineNode(iterator, "nextNode", afterNode);
			afterOffset = 0;
		}
		let beforeNode = startContainer;
		let beforeOffset = startOffset - 1;
		if (!isTextNode(beforeNode) || beforeOffset === -1) {
			beforeNode = getAdjacentInlineNode(
				iterator,
				"previousPONode",
				afterNode || (isTextNode(startContainer) ? startContainer : startContainer.childNodes[startOffset] || startContainer)
			);
			if (isTextNode(beforeNode)) {
				beforeOffset = beforeNode.data.length;
			}
		}
		let node = null;
		let offset = 0;
		if (isTextNode(afterNode) && afterNode.data.charAt(afterOffset) === " " && rangeDoesStartAtBlockBoundary(range, root)) {
			node = afterNode;
			offset = afterOffset;
		} else if (isTextNode(beforeNode) && beforeNode.data.charAt(beforeOffset) === " ") {
			if (isTextNode(afterNode) && afterNode.data.charAt(afterOffset) === " " || rangeDoesEndAtBlockBoundary(range, root)) {
				node = beforeNode;
				offset = beforeOffset;
			}
		}
		node && node.replaceData(offset, 1, "\xA0");
		range.setStart(startContainer, startOffset);
		range.collapse(true);
		return frag;
	},

	// Contents of range will be deleted.
	// After method, range will be around inserted content
	insertTreeFragmentIntoRange = (range, frag, root) => {
		const firstInFragIsInline = frag.firstChild && isInline(frag.firstChild);
		let node, block, blockContentsAfterSplit, stopPoint, container, offset;
		let replaceBlock, firstBlockInFrag, nodeAfterSplit, nodeBeforeSplit;
		let tempRange;

		// Fixup content: ensure no top-level inline, and add cursor fix elements.
		fixContainer(frag, root);
		node = frag;
		while (node = getNextBlock(node, root)) {
			fixCursor(node);
		}

		// Delete any selected content.
		if (!range.collapsed) {
			deleteContentsOfRange(range, root);
		}

		// Move range down into text nodes.
		moveRangeBoundariesDownTree(range);
		range.collapse(); // collapse to end

		// Where will we split up to? First blockquote parent, otherwise root.
		stopPoint = getClosest(range.endContainer, root, "BLOCKQUOTE") || root;

		// Merge the contents of the first block in the frag with the focused block.
		// If there are contents in the block after the focus point, collect this
		// up to insert in the last block later. This preserves the style that was
		// present in this bit of the page.
		//
		// If the block being inserted into is empty though, replace it instead of
		// merging if the fragment had block contents.
		// e.g. <blockquote><p>Foo</p></blockquote>
		// This seems a reasonable approximation of user intent.

		block = getStartBlockOfRange(range, root);
		firstBlockInFrag = getNextBlock(frag, frag);
		replaceBlock = !firstInFragIsInline && !!block && isEmptyBlock(block);
		if (block && firstBlockInFrag && !replaceBlock && // Don't merge table cells or PRE elements into block
		!getClosest(firstBlockInFrag, frag, "PRE,TABLE")) {
			moveRangeBoundariesUpTree(range, block, block, root);
			range.collapse(true); // collapse to start
			container = range.endContainer;
			offset = range.endOffset;
			// Remove trailing <br> – we don't want this considered content to be
			// inserted again later
			cleanupBRs(block, root, false);
			if (isInline(container)) {
				// Split up to block parent.
				nodeAfterSplit = split(
					container,
					offset,
					getPreviousBlock(container, root) || root,
					root
				);
				container = nodeAfterSplit.parentNode;
				offset = indexOf(container.childNodes, nodeAfterSplit);
			}
			if (/*isBlock(container) && */
				offset !== getLength(container)
			) {
				// Collect any inline contents of the block after the range point
				blockContentsAfterSplit = doc.createDocumentFragment();
				while (node = container.childNodes[offset]) {
					blockContentsAfterSplit.append(node);
				}
			}
			// And merge the first block in.
			mergeWithBlock(container, firstBlockInFrag, range, root);

			// And where we will insert
			offset = indexOf(container.parentNode.childNodes,
				container
			) + 1;
			container = container.parentNode;
			range.setEnd(container, offset);
		}

		// Is there still any content in the fragment?
		if (getLength(frag)) {
			if (replaceBlock && block) {
				range.setEndBefore(block);
				range.collapse();
				detach(block);
			}
			moveRangeBoundariesUpTree(range, stopPoint, stopPoint, root);
			// Now split after block up to blockquote (if a parent) or root
			nodeAfterSplit = split(
				range.endContainer,
				range.endOffset,
				stopPoint,
				root
			);
			nodeBeforeSplit = nodeAfterSplit ? nodeAfterSplit.previousSibling : stopPoint.lastChild;
			stopPoint.insertBefore(frag, nodeAfterSplit);
			if (nodeAfterSplit) {
				range.setEndBefore(nodeAfterSplit);
			} else {
				range.setEnd(stopPoint, getLength(stopPoint));
			}
			block = getEndBlockOfRange(range, root);

			// Get a reference that won't be invalidated if we merge containers.
			moveRangeBoundariesDownTree(range);
			container = range.endContainer;
			offset = range.endOffset;

			// Merge inserted containers with edges of split
			if (nodeAfterSplit && isContainer(nodeAfterSplit)) {
				mergeContainers(nodeAfterSplit, root);
			}
			nodeAfterSplit = nodeBeforeSplit?.nextSibling;
			if (nodeAfterSplit && isContainer(nodeAfterSplit)) {
				mergeContainers(nodeAfterSplit, root);
			}
			range.setEnd(container, offset);
		}

		// Insert inline content saved from before.
		if (blockContentsAfterSplit && block) {
			tempRange = range.cloneRange();
			mergeWithBlock(block, blockContentsAfterSplit, tempRange, root);
			range.setEnd(tempRange.endContainer, tempRange.endOffset);
		}
		moveRangeBoundariesDownTree(range);
	},
/*
	// source/range/Contents.ts
	getTextContentsOfRange = (range) => {
		if (range.collapsed) {
			return "";
		}
		const startContainer = range.startContainer;
		const endContainer = range.endContainer;
		const walker = new TreeIterator(
			range.commonAncestorContainer,
			SHOW_ELEMENT_OR_TEXT,
			(node2) => {
				return isNodeContainedInRange(range, node2, true);
			}
		);
		walker.currentNode = startContainer;
		let node = startContainer;
		let textContent = "";
		let addedTextInBlock = false;
		let value;
		if (!isElement(node) && !isTextNode(node) || !walker.filter(node)) {
			node = walker.nextNode();
		}
		while (node) {
			if (isTextNode(node)) {
				value = node.data;
				if (value && /\S/.test(value)) {
					if (node === endContainer) {
						value = value.slice(0, range.endOffset);
					}
					if (node === startContainer) {
						value = value.slice(range.startOffset);
					}
					textContent += value;
					addedTextInBlock = true;
				}
			} else if (isBrElement(node) || addedTextInBlock && !isInline(node)) {
				textContent += "\n";
				addedTextInBlock = false;
			}
			node = walker.nextNode();
		}
		textContent = textContent.replace(/\xA0/g, " ");
		return textContent;
	},
*/
	// source/Clipboard.ts
	indexOf = (array, value) => Array.prototype.indexOf.call(array, value),
	extractRangeToClipboard = (event, range, root) => {
		// Edge only seems to support setting plain text as of 2016-03-11.
		if (event.clipboardData) {
			// Clipboard content should include all parents within block, or all
			// parents up to root if selection across blocks
			let startBlock = getStartBlockOfRange(range, root),
				endBlock = getEndBlockOfRange(range, root),
				copyRoot = ((startBlock === endBlock) && startBlock) || root,
				contents, parent, newContents;
			// Clone range to mutate, then move up as high as possible without
			// passing the copy root node.
			range = range.cloneRange();
			moveRangeBoundariesDownTree(range);
			moveRangeBoundariesUpTree(range, copyRoot, copyRoot, root);
			// Extract the contents
			contents = range.cloneContents();
			// Add any other parents not in extracted content, up to copy root
			parent = range.commonAncestorContainer;
			if (isTextNode(parent)) {
				parent = parent.parentNode;
			}
			while (parent && parent !== copyRoot) {
				newContents = parent.cloneNode(false);
				newContents.append(contents);
				contents = newContents;
				parent = parent.parentNode;
			}
			// Set clipboard data
			setClipboardData(event, contents, root);
		}
	},
	// The (non-standard but supported enough) innerText property is based on the
	// render tree in Firefox and possibly other browsers, so we must insert the
	// DOM node into the document to ensure the text part is correct.
	setClipboardData = (event, contents, root) => {
		let clipboardData = event.clipboardData;
		let body = doc.body;
		let node = createElement("div");
		let html, text;

		node.append(contents);

		html = node.innerHTML;

		// Firefox will add an extra new line for BRs at the end of block when
		// calculating innerText, even though they don't actually affect
		// display, so we need to remove them first.
		cleanupBRs(node, root, true);
		node.setAttribute("style",
			'position:fixed;overflow:hidden;bottom:100%;right:100%;');
		body.append(node);
		text = (node.innerText || node.textContent).replace(NBSP, ' '); // Replace nbsp with regular space
		node.remove();

		if (text !== html) {
			clipboardData.setData("text/html", html);
		}
		clipboardData.setData("text/plain", text);
		event.preventDefault();
	},
	onCut = function(event) {
		let self = this;
		let range = self.getSelection();
		let root = self._root;
		let startBlock, endBlock, copyRoot, contents, parent, newContents;

		// Nothing to do
		if (range.collapsed) {
			event.preventDefault();
			return;
		}

		// Save undo checkpoint
		self.saveUndoState(range);

		// Edge only seems to support setting plain text as of 2016-03-11.
		if (event.clipboardData) {
			// Clipboard content should include all parents within block, or all
			// parents up to root if selection across blocks
			startBlock = getStartBlockOfRange(range, root);
			endBlock = getEndBlockOfRange(range, root);
			copyRoot = ((startBlock === endBlock) && startBlock) || root;
			// Extract the contents
			contents = deleteContentsOfRange(range, root);
			// Add any other parents not in extracted content, up to copy root
			parent = range.commonAncestorContainer;
			if (isTextNode(parent)) {
				parent = parent.parentNode;
			}
			while (parent && parent !== copyRoot) {
				newContents = parent.cloneNode(false);
				newContents.append(contents);
				contents = newContents;
				parent = parent.parentNode;
			}
			// Set clipboard data
			setClipboardData(event, contents, root);
		} else {
			setTimeout(() => {
				try {
					// If all content removed, ensure div at start of root.
					self._ensureBottomLine();
				} catch (error) {
					didError(error);
				}
			}, 0);
		}

		self.setSelection(range);
	},
	onCopy = function(event) {
		extractRangeToClipboard(
			event,
			this.getSelection(),
			this._root
		);
	},
	onPaste = function(event) {
		const clipboardData = event.clipboardData;
		const items = clipboardData?.items;
		let imageItem = null;
		let plainItem = null;
		let htmlItem = null;
		let self = this;
		let type;

		// Current HTML5 Clipboard interface
		// ---------------------------------
		// https://html.spec.whatwg.org/multipage/interaction.html
		if (items) {
			[...items].forEach(item => {
				type = item.type;
				if (type === 'text/html') {
					htmlItem = item;
				// iOS copy URL gives you type text/uri-list which is just a list
				// of 1 or more URLs separated by new lines. Can just treat as
				// plain text.
				} else if (type === 'text/plain' || type === 'text/uri-list') {
					plainItem = item;
				} else if (item.kind === "file" && /^image\/(png|jpeg|webp)/.test(type)) {
					imageItem = item;
				}
			});
			if (htmlItem || plainItem || imageItem) {
				event.preventDefault();
				if (imageItem) {
					let reader = new FileReader();
					reader.onload = event => {
						let img = createElement("img", {src: event.target.result}),
							canvas = createElement("canvas"),
							ctx = canvas.getContext('2d');
						img.onload = ()=>{
							ctx.drawImage(img, 0, 0);
							let width = img.width, height = img.height;
							if (width > height) {
								// Landscape
								if (width > 1024) {
									height = height * 1024 / width;
									width = 1024;
								}
							} else if (height > 1024) {
								// Portrait
								width = width * 1024 / height;
								height = 1024;
							}
							canvas.width = width;
							canvas.height = height;
							ctx.drawImage(img, 0, 0, width, height);
							self.insertHTML('<img alt="" style="width:100%;max-width:'+width+'px" src="'+canvas.toDataURL()+'">', true);
						};
					}
					reader.readAsDataURL(imageItem.getAsFile());
				} else if (htmlItem && (!self.isShiftDown || !plainItem)) {
					htmlItem.getAsString(html => self.insertHTML(html, true));
				} else if (plainItem) {
					plainItem.getAsString(text => self.insertPlainText(text, true));
				}
			}
		}
	},

	// source/keyboard/KeyHelpers.ts
	// If you delete the content inside a span with a font styling, Webkit will
	// replace it with a <font> tag (!). If you delete all the text inside a
	// link in Opera, it won't delete the link. Let's make things consistent. If
	// you delete all text inside an inline tag, remove the inline tag.
	afterDelete = (self, range) => {
		try {
			range = range || self.getSelection();
			let node = range.startContainer,
				parent;
			// Climb the tree from the focus point while we are inside an empty
			// inline element
			if (isTextNode(node)) {
				node = node.parentNode;
			}
			parent = node;
			while (isInline(parent) && (!parent.textContent || parent.textContent === ZWS)) {
				node = parent;
				parent = node.parentNode;
			}
			// If focused in empty inline element
			if (node !== parent) {
				// Move focus to just before empty inline(s)
				range.setStart(parent, indexOf(parent.childNodes, node));
				range.collapse(true);
				// Remove empty inline(s)
				node.remove();
				// Fix cursor in block
				if (!isBlock(parent)) {
					parent = getPreviousBlock(parent, self._root) || parent;
				}
				fixCursor(parent);
				// Move cursor into text node
				moveRangeBoundariesDownTree(range);
			}
			// If you delete the last character in the sole <div> in Chrome,
			// it removes the div and replaces it with just a <br> inside the
			// root. Detach the <br>; the _ensureBottomLine call will insert a new
			// block.
			if (node === self._root && (node = node.firstChild) && isBrElement(node)) {
				detach(node);
			}
			self._ensureBottomLine();
			self.setRange(range);
		} catch (error) {
			didError(error);
		}
	},

	// source/keyboard/Backspace.ts
	Backspace = (self, event, range) => {
		const root = self._root;
		self._removeZWS();
		// Record undo checkpoint.
		self.saveUndoState(range);
		// If not collapsed, delete contents
		if (!range.collapsed) {
			event.preventDefault();
			deleteContentsOfRange(range, root);
			afterDelete(self, range);
		}
		// If at beginning of block, merge with previous
		else if (rangeDoesStartAtBlockBoundary(range, root)) {
			event.preventDefault();
			let current = getStartBlockOfRange(range, root);
			let previous;
			if (!current) {
				return;
			}
			// In case inline data has somehow got between blocks.
			fixContainer(current.parentNode, root);
			// Now get previous block
			previous = getPreviousBlock(current, root);
			// Must not be at the very beginning of the text area.
			if (previous) {
				// If not editable, just delete whole block.
				if (!previous.isContentEditable) {
					detachUneditableNode(previous, root);
					return;
				}
				// Otherwise merge.
				mergeWithBlock(previous, current, range, root);
				// If deleted line between containers, merge newly adjacent
				// containers.
				current = previous.parentNode;
				while (current !== root && !current.nextSibling) {
					current = current.parentNode;
				}
				if (current !== root && (current = current.nextSibling)) {
					mergeContainers(current, root);
				}
				self.setSelection(range);
			}
			// If at very beginning of text area, allow backspace
			// to break lists/blockquote.
			else if (current) {
				if (decreaseLevel(self, range, current)) {
					return;
				}
				self.setRange(range);
			}
		}
		// Otherwise, leave to browser but check afterwards whether it has
		// left behind an empty inline tag.
		else {
			self.setSelection(range);
			setTimeout(() => afterDelete(self), 0);
		}
	},

	// source/keyboard/Delete.ts
	Delete = (self, event, range) => {
		const root = self._root;
		let current;
		let next;
		let originalRange;
		let cursorContainer;
		let cursorOffset;
		let nodeAfterCursor;
		self._removeZWS();
		// Record undo checkpoint.
		self.saveUndoState(range);
		if (!range.collapsed) {
			// If not collapsed, delete contents
			event.preventDefault();
			deleteContentsOfRange(range, root);
			afterDelete(self, range);
		} else if (rangeDoesEndAtBlockBoundary(range, root)) {
			// If at end of block, merge next into this block
			event.preventDefault();
			if (current = getStartBlockOfRange(range, root)) {
				// In case inline data has somehow got between blocks.
				fixContainer(current.parentNode, root);
				// Now get next block
				// Must not be at the very end of the text area.
				if (next = getNextBlock(current, root)) {
					// If not editable, just delete whole block.
					if (!next.isContentEditable) {
						detachUneditableNode(next, root);
						return;
					}
					// Otherwise merge.
					mergeWithBlock(current, next, range, root);
					// If deleted line between containers, merge newly adjacent
					// containers.
					next = current.parentNode;
					while (next !== root && !next.nextSibling) {
						next = next.parentNode;
					}
					if (next !== root && (next = next.nextSibling)) {
						mergeContainers(next, root);
					}
					self.setRange(range);
				}
			}
		} else {
			// Otherwise, leave to browser but check afterwards whether it has
			// left behind an empty inline tag.
			// But first check if the cursor is just before an IMG tag. If so,
			// delete it ourselves, because the browser won't if it is not
			// inline.
			originalRange = range.cloneRange();
			moveRangeBoundariesUpTree(range, root, root, root);
			cursorContainer = range.endContainer;
			cursorOffset = range.endOffset;
			if (isElement(cursorContainer)) {
				nodeAfterCursor = cursorContainer.childNodes[cursorOffset];
				if (nodeAfterCursor?.nodeName === "IMG") {
					event.preventDefault();
					detach(nodeAfterCursor);
					moveRangeBoundariesDownTree(range);
					afterDelete(self, range);
					return;
				}
			}
			self.setSelection(originalRange);
			setTimeout(() => afterDelete(self), 0);
		}
	},

	// source/keyboard/Tab.ts
	Tab = (self, event, range) => {
		self._removeZWS();
		// If no selection and at start of block
		if (range.collapsed && rangeDoesStartAtBlockBoundary(range, self._root)) {
			getClosest(range.startContainer, self._root, "UL,OL,BLOCKQUOTE")
			&& self.changeIndentationLevel('increase')
			&& event.preventDefault();
		}
	},
	ShiftTab = (self, event, range) => {
		self._removeZWS();
		// If no selection and at start of block
		if (range.collapsed && rangeDoesStartAtBlockBoundary(range, self._root)) {
			// Break list
			decreaseLevel(self, range, range.startContainer)
			&& event.preventDefault();
		}
	},

	// source/keyboard/Space.ts
	Space = (self, event, range) => {
/*
		var _a;
		let node;
		const root = self._root;
		self._recordUndoState(range);
		self._getRangeAndRemoveBookmark(range);
		if (!range.collapsed) {
			deleteContentsOfRange(range, root);
			self._ensureBottomLine();
			self.setSelection(range);
			self._updatePath(range, true);
		} else if (rangeDoesEndAtBlockBoundary(range, root)) {
			const block = getStartBlockOfRange(range, root);
			if (block && block.nodeName !== "PRE") {
				const text = (_a = block.textContent) == null ? void 0 : _a.trimEnd().replace(ZWS, "");
				if (text === "*" || text === "1.") {
					event.preventDefault();
					const walker = new TreeIterator(block, SHOW_TEXT);
					let textNode;
					while (textNode = walker.nextNode()) {
						textNode.data = cantFocusEmptyTextNodes ? ZWS : "";
					}
					if (text === "*") {
						self.makeUnorderedList();
					} else {
						self.makeOrderedList();
					}
					return;
				}
			}
		}
		node = range.endContainer;
		if (range.endOffset === getLength(node)) {
			do {
				if (node.nodeName === "A") {
					range.setStartAfter(node);
					break;
				}
			} while (!node.nextSibling && (node = node.parentNode) && node !== root);
		}
		if (self._config.addLinks) {
			const linkRange = range.cloneRange();
			moveRangeBoundariesDownTree(linkRange);
			const textNode = linkRange.startContainer;
			const offset = linkRange.startOffset;
			setTimeout(() => {
				linkifyText(self, textNode, offset);
			}, 0);
		}
		self.setSelection(range);
*/
		const root = self._root;
		self._recordUndoState(range);
		self._config.addLinks && addLinks(range.startContainer, root);
		self._getRangeAndRemoveBookmark(range);
/*
		// If the cursor is at the end of a link (<a>foo|</a>) then move it
		// outside of the link (<a>foo</a>|) so that the space is not part of
		// the link text.
		// SnappyMail: disabled as it fails in Firefox
		let node = range.endContainer;
		if (range.collapsed && range.endOffset === getLength(node)) {
			do {
				if (node.nodeName === "A") {
					range.setStartAfter(node);
					break;
				}
			} while (!node.nextSibling && (node = node.parentNode) && node !== root);
		}
*/
		// Delete the selection if not collapsed
		if (!range.collapsed) {
			deleteContentsOfRange(range, root);
			self._ensureBottomLine();
		}
		self.setRange(range);
	},

	// source/keyboard/KeyHandlers.ts
	onKey = function(event) {
		if (event.defaultPrevented) {
			return;
		}

		let key = event.key.toLowerCase(),
			range = this.getSelection(),
			root = this._root;

		// We need to apply the backspace/delete handlers regardless of control key modifiers.
		// ctrl-shift-key or meta-shift-key
		if (key !== "backspace" && key !== "delete") {
			if (event.shiftKey) { key = 'shift-' + key; }
			if (event[osKey]) { key = ctrlKey + key; }
//			if (event.altKey) { key = 'alt-' + key; }
		}
		if (this._keyHandlers[key]) {
			this._keyHandlers[key](this, event, range);
		// !event.isComposing stops us from blatting Kana-Kanji conversion in Safari
		} else if (!range.collapsed && !event.isComposing && !event[osKey] && key.length === 1) {
			// Record undo checkpoint.
			this.saveUndoState(range);
			// Delete the selection
			deleteContentsOfRange(range, root);
			this._ensureBottomLine();
			this.setRange(range);
		} else if (range.collapsed && range.startContainer === root && root.children.length > 0) {
			// Under certain conditions, cursor/range can be positioned directly
			// under this._root (not wrapped) and when this happens, an inline(TEXT)
			// element is attached directly to this._root. There might be other
			// issues, but squire.makeUnorderedList(), squire.makeOrderedList() and
			// maybe other functions that call squire.modifyBlocks() do NOT work
			// on inline(TEXT) nodes that are direct children of this._root.
			// Therefor, we try to detect this case here and wrap the cursor/range
			// before the text is inserted.

			const nextElement = root.children[range.startOffset];
			if (nextElement && !isBlock(nextElement)) {
				// create a new wrapper
				range = createRange(root.insertBefore(
					this.createDefaultBlock(), nextElement
				), 0);
				if (isBrElement(nextElement)) {
					// delete it because a new <br> is created by createDefaultBlock()
					root.removeChild(nextElement);
				}
				const restore = this._restoreSelection;
				this.setSelection(range);
				this._restoreSelection = restore;
			}
		}
	},
	keyHandlers = {
//		"backspace": Backspace,
//		"delete": Delete,
		tab: Tab,
		'shift-tab': ShiftTab,
		space: Space,
		arrowleft: self => self._removeZWS(),
		arrowright: self => self._removeZWS()
	},
	mapKeyToFormat = (tag, remove) => {
		return (self, event) => {
			event.preventDefault();
			self.toggleTag(tag, remove);
		};
	},
	mapKeyTo = method => (self, event) => {
		event.preventDefault();
		self[method]();
	},

	blockTag = "DIV",
	DOCUMENT_POSITION_PRECEDING = 2, // Node.DOCUMENT_POSITION_PRECEDING

	NBSP = '\u00A0',

	win = doc.defaultView,

	osKey = isMac ? "metaKey" : "ctrlKey",

	filterAccept = NodeFilter.FILTER_ACCEPT,
/*
	typeToBitArray = {
		// ELEMENT_NODE
		1: 1,
		// ATTRIBUTE_NODE
		2: 2,
		// TEXT_NODE
		3: 4,
		// COMMENT_NODE
		8: 128,
		// DOCUMENT_NODE
		9: 256,
		// DOCUMENT_FRAGMENT_NODE
		11: 1024
	},
*/

	isElement = node => node instanceof Element,
	isTextNode = node => node instanceof Text,
//	isBrElement = node => node instanceof HTMLBRElement,
	isBrElement = node => "BR" === node?.nodeName,

	createTreeWalker = (root, whatToShow, filter) => {
		const walker = doc.createTreeWalker(root, whatToShow, filter ? {
			acceptNode: node => filter(node) ? filterAccept : NodeFilter.FILTER_SKIP
		} : null);
		walker.previousPONode = () => previousPONode(walker, filter);
		return walker;
	},

	setAttributes = (node, props) => {
		props && Object.entries(props).forEach(([k,v]) => {
			if (null == v) {
				node.removeAttribute(k);
			} else if ("style" === k && typeof v === "object") {
				Object.entries(v).forEach(([k,v]) => node.style[k] = v);
			} else {
				node.setAttribute(k, v);
			}
		});
	},

	newContentWalker = root => createTreeWalker(root,
		SHOW_ELEMENT_OR_TEXT,
		node => isTextNode(node) ? notWS.test(node.data) : node.nodeName === "IMG"
	),

	didError = error => console.error(error),

	detachUneditableNode = (node, root) => {
		let parent;
		while (parent = node.parentNode) {
			if (parent === root || parent.isContentEditable) {
				break;
			}
			node = parent;
		}
		detach(node);
	},

	changeIndentationLevel = direction => (self, event) => {
		event.preventDefault();
		self.changeIndentationLevel(direction);
	},

	toggleList = (type, methodIfNotInList) => (self, event) => {
		event.preventDefault();
		let parent = self.getSelectionClosest('UL,OL');
		if (type == parent?.nodeName) {
			self.removeList();
		} else {
			self[methodIfNotInList]();
		}
	},

	// TreeIterator Previous node in post-order.
	previousPONode = (walker,  filter) => {
		let current = walker.currentNode,
			root = walker.root,
			node;
		const isAcceptableNode = node => {
			const nodeType = node.nodeType;
			const nodeFilterType = nodeType === ELEMENT_NODE ? SHOW_ELEMENT : nodeType === TEXT_NODE ? SHOW_TEXT : 0;
			return !!(nodeFilterType & walker.whatToShow) && filter(node);
		}
		while (true) {
			if (current === root) {
				return null;
			}
			node = current.previousSibling;
			if (node) {
				while (current = node.lastChild) {
					node = current;
				}
			} else {
				node = current.parentNode;
			}
			if (!node) {
				return null;
			}
			if (isAcceptableNode(node)) {
				walker.currentNode = node;
				return node;
			}
			current = node;
		}
	},

	mergeObjects = (base, extras, mayOverride) => {
		base = base || {};
		extras && Object.entries(extras).forEach(([prop,value])=>{
			if (mayOverride || !(prop in base)) {
				base[prop] = (value?.constructor === Object) ?
					mergeObjects(base[prop], value, mayOverride) :
					value;
			}
		});
		return base;
	},

	// --- Events ---

	// Subscribing to these events won't automatically add a listener to the
	// document node, since these events are fired in a custom manner by the
	// editor code.
	customEvents = {
		pathChange: 1, select: 1, input: 1, undoStateChange: 1
	},

	// --- Bookmarking ---

	startSelectionId = 'squire-selection-start',
	endSelectionId = 'squire-selection-end',

	createBookmarkNodes = () => [
		createElement("INPUT", {
			id: startSelectionId,
			type: "hidden"
		}),
		createElement("INPUT", {
			id: endSelectionId,
			type: "hidden"
		})
	],

	// --- Block formatting ---

	tagAfterSplit = {
		DT:  "DD",
		DD:  "DT",
		LI:  "LI",
		PRE: "PRE"
	},

	getListSelection = (range, root) => {
		// Get start+end li in single common ancestor
		let list = range.commonAncestorContainer;
		let startLi = range.startContainer;
		let endLi = range.endContainer;
		while (list && list !== root && !listNodeNames.has(list.nodeName)) {
			list = list.parentNode;
		}
		if (!list || list === root) {
			return null;
		}
		if (startLi === list) {
			startLi = startLi.childNodes[range.startOffset];
		}
		if (endLi === list) {
			endLi = endLi.childNodes[range.endOffset];
		}
		while (startLi && startLi.parentNode !== list) {
			startLi = startLi.parentNode;
		}
		while (endLi && endLi.parentNode !== list) {
			endLi = endLi.parentNode;
		}
		return [list, startLi, endLi];
	},

	makeList = (self, frag, type) => {
		let walker = getBlockWalker(frag, self._root),
			node, tag, prev, newLi;

		while (node = walker.nextNode()) {
			if (node.parentNode.nodeName === "LI") {
				node = node.parentNode;
				walker.currentNode = node.lastChild;
			}
			if (node.nodeName !== "LI") {
				newLi = createElement("LI");
				if (node.dir) {
					newLi.dir = node.dir;
				}

				// Have we replaced the previous block with a new <ul>/<ol>?
				if ((prev = node.previousSibling) && prev.nodeName === type) {
					prev.append(newLi);
					detach(node);
				}
				// Otherwise, replace this block with the <ul>/<ol>
				else {
					node.replaceWith(
						createElement(type, null, [
							newLi
						])
					);
				}
				newLi.append(empty(node));
				walker.currentNode = newLi;
			} else {
				node = node.parentNode;
				tag = node.nodeName;
				if (tag !== type && listNodeNames.has(tag)) {
					node.replaceWith(
						createElement(type, null, [empty(node)])
					);
				}
			}
		}

		return frag;
	},

	setDirection = (self, frag, dir) => {
		let walker = getBlockWalker(frag, self._root),
			node;

		while (node = walker.nextNode()) {

			if (node.nodeName === "LI") {
				node.parentNode.setAttribute("dir", dir);
				break;
			}

			node.setAttribute("dir", dir);
		}
		return frag;
	},

	decreaseLevel = (self, range, node) =>
		getClosest(node, self._root, 'UL,OL,BLOCKQUOTE') && self.changeIndentationLevel('decrease'),

	linkRegExp = /\b(?:((https?:\/\/)?(?:www\d{0,3}\.|[a-z0-9][a-z0-9.-]*\.[a-z]{2,}\/)(?:[^\s()<>]+|\([^\s()<>]+\))+(?:[^\s?&`!()[\]{};:'".,<>«»“”‘’]|\([^\s()<>]+\)))|([\w\-.%+]+@(?:[\w-]+\.)+[a-z]{2,}\b(?:\?[^&?\s]+=[^\s?&`!()[\]{};:'".,<>«»“”‘’]+(?:&[^&?\s]+=[^\s?&`!()[\]{};:'".,<>«»“”‘’]+)*)?))/i,

	addLinks = (frag, root) => {
		let walker = createTreeWalker(frag, SHOW_TEXT, node => !getClosest(node, root, "A"));
		let node, data, parent, match, index, endIndex, child;
		while (node = walker.nextNode()) {
			data = node.data;
			parent = node.parentNode;
			while (match = linkRegExp.exec(data)) {
				index = match.index;
				endIndex = index + match[0].length;
				if (index) {
					child = doc.createTextNode(data.slice(0, index));
					parent.insertBefore(child, node);
				}
				child = createElement("A", {
					href: match[1]
						? (match[2] ? match[1] : 'https://' + match[1])
						: 'mailto:' + match[0]
				}, [data.slice(index, endIndex)]);
				parent.insertBefore(child, node);
				node.data = data = data.slice(endIndex);
			}
		}
	};

let nodeCategoryCache = new WeakMap();

keyHandlers[ctrlKey + "b"] = mapKeyToFormat("B");
keyHandlers[ctrlKey + "i"] = mapKeyToFormat("I");
keyHandlers[ctrlKey + "u"] = mapKeyToFormat("U");
keyHandlers[ctrlKey + 'shift-7'] = mapKeyToFormat("S");
keyHandlers[ctrlKey + 'shift-5'] = mapKeyToFormat("SUB", "SUP");
keyHandlers[ctrlKey + 'shift-6'] = mapKeyToFormat("SUP", "SUB");
keyHandlers[ctrlKey + 'shift-8'] = toggleList("UL", "makeUnorderedList");
keyHandlers[ctrlKey + 'shift-9'] = toggleList("OL", "makeOrderedList");
keyHandlers[ctrlKey + '['] = changeIndentationLevel("decrease");
keyHandlers[ctrlKey + ']'] = changeIndentationLevel("increase");
keyHandlers[ctrlKey + "d"] = mapKeyTo("toggleCode");
keyHandlers[ctrlKey + "y"] = mapKeyTo("redo");
//keyHandlers[ctrlKey + "z"] = mapKeyTo("undo");
keyHandlers[ctrlKey + 'shift-z'] = mapKeyTo("redo");
keyHandlers["redo"] = mapKeyTo("redo");
//keyHandlers["undo"] = mapKeyTo("undo");

class EditStack extends Array
{
	constructor(squire) {
		super();
		this.squire = squire;
		this.index = -1;
		this.inUndoState = false;

		this.threshold = -1; // -1 means no threshold
		this.limit = -1; // -1 means no limit
	}

	clear() {
		this.index = -1;
		this.length = 0;
	}

	stateChanged(/*canUndo, canRedo*/) {
		this.squire.fireEvent("undoStateChange", {
			canUndo: this.index > 0,
			canRedo: this.index + 1 < this.length
		});
		this.squire.fireEvent("input");
	}

	docWasChanged() {
		if (this.inUndoState) {
			this.inUndoState = false;
			this.stateChanged(/*true, false*/);
		} else
			this.squire.fireEvent("input");
	}

	/**
	 * Leaves bookmark.
	 */
	recordUndoState(range, replace) {
		// Don't record if we're already in an undo state
		if (!this.inUndoState || replace) {
			// Advance pointer to new position
			let undoIndex = this.index;
			let undoThreshold = this.threshold;
			let undoLimit = this.limit;
			let squire = this.squire;

			replace || ++undoIndex;
			undoIndex = Math.max(0, undoIndex);

			// Truncate stack if longer (i.e. if has been previously undone)
			this.length = Math.min(undoIndex + 1, this.length);

			// Get data
			range && squire._saveRangeToBookmark(range);
			const html = squire._getHTML();

			// If this document is above the configured size threshold,
			// limit the number of saved undo states.
			// Threshold is in bytes, JS uses 2 bytes per character
			if (undoThreshold > -1 && html.length * 2 > undoThreshold
			 && undoLimit > -1 && undoIndex > undoLimit) {
				this.splice(0, undoIndex - undoLimit);
				undoIndex = undoLimit;
			}

			// Save data
			this[undoIndex] = html;
			this.index = undoIndex;
			this.inUndoState = true;
		}
	}

	saveUndoState(range) {
		let squire = this.squire;
		range = range || squire.getSelection();
		this.recordUndoState(range, true);
		squire._getRangeAndRemoveBookmark(range);
	}

	undo() {
		let squire = this.squire,
			undoIndex = this.index - 1;
		// Sanity check: must not be at beginning of the history stack
		if (undoIndex >= 0 || !this.inUndoState) {
			// Make sure any changes since last checkpoint are saved.
			this.recordUndoState(squire.getSelection());
			this.index = undoIndex;
			squire._setHTML(this[undoIndex]);
			let range = squire._getRangeAndRemoveBookmark();
			if (range) {
				squire.setSelection(range);
			}
			this.inUndoState = true;
			this.stateChanged(/*undoIndex > 0, true*/);
		}
	}

	redo() {
		// Sanity check: must not be at end of stack and must be in an undo state.
		let squire = this.squire,
			undoIndex = this.index + 1;
		if (undoIndex < this.length && this.inUndoState) {
			this.index = undoIndex;
			squire._setHTML(this[undoIndex]);
			let range = squire._getRangeAndRemoveBookmark();
			if (range) {
				squire.setSelection(range);
			}
			this.stateChanged(/*true, undoIndex + 1 < this.length*/);
		}
	}
}

class Squire
{
	constructor(root, config) {
		this._root = root;
		this.setConfig(config);
		this._isFocused = false;
		this._lastRange = null;
		this._restoreSelection = false;
		this._mayHaveZWS = false;
		this._path = "";
		this._pathRange = null;
		this._events = {}; // new Map();
		this._ignoreChange = false;
		this.editStack = new EditStack(this);
		doc.addEventListener("selectionchange", () => this._isFocused && this._updatePath(this.getSelection()));
		this.addEventListener("blur", () => this._restoreSelection = true)
			.addEventListener("pointerdown mousedown touchstart", () => this._restoreSelection = false)
			.addEventListener("focus", () => this._restoreSelection && this.setSelection(this._lastRange))
			.addEventListener("cut", onCut)
			.addEventListener("copy", onCopy)
			// Need to monitor for shift key like this, as event.shiftKey is not available in paste event.
			.addEventListener("keydown keyup", event => this.isShiftDown = event.shiftKey)
			.addEventListener("paste", onPaste)
			// On Windows you can drag an drop text. We can"t handle this ourselves, because
			// as far as I can see, there"s no way to get the drop insertion point. So just
			// save an undo state and hope for the best.
			.addEventListener("drop", event => {
				let types = event.dataTransfer.types;
				if (types.includes("text/plain") || types.includes("text/html")) {
					this.saveUndoState();
				}
			})
			.addEventListener("keydown", onKey)
			.addEventListener("pointerup keyup mouseup touchend", ()=>this.getSelection());

		this._keyHandlers = Object.create(keyHandlers);
		this._mutation = new MutationObserver(() => this._docWasChanged());
		this._mutation.observe(root, {
			childList: true,
			attributes: true,
			characterData: true,
			subtree: true
		});
		root.setAttribute("contenteditable", "true");
		this.addEventListener(
			"beforeinput",
			this._beforeInput
		);
		this.setHTML("");

		this._beforeInputTypes = {
//			insertFromPaste: event => {},
//			insertReplacementText: event => {},
			insertText: event => {
				if (isAndroid && event.data && event.data.includes("\n")) {
					event.preventDefault();
				}
			},
			// shift + enter
			insertLineBreak: event => {
				event.preventDefault();
				this.splitBlock(true);
			},
			// enter
			insertParagraph: event => {
				event.preventDefault();
				this.splitBlock(false);
			},
			insertOrderedList: event => {
				event.preventDefault();
				this.makeOrderedList();
			},
			insertUnoderedList: event => {
				event.preventDefault();
				this.makeUnorderedList();
			},
			historyUndo: event => {
				event.preventDefault();
				this.undo();
			},
			historyRedo: event => {
				event.preventDefault();
//				this.redo();
			},
			formatRemove: event => {
				event.preventDefault();
				this.setStyle();
			},
			formatSetBlockTextDirection: event => {
				event.preventDefault();
				let dir = event.data;
				this.bidi(dir === "null" ? null : dir);
			},
			formatBackColor: event => {
				event.preventDefault();
				this.setStyle({backgroundColor:event.data});
			},
			formatFontColor: event => {
				event.preventDefault();
				this.setStyle({color:event.data});
			},
			formatFontName: event => {
				event.preventDefault();
				this.setStyle({fontFamily:event.data});
			},
/*
			formatIndent: event => {
				event.preventDefault();
				this.changeIndentationLevel("increase");
			},
			formatOutdent: event => {
				event.preventDefault();
				this.changeIndentationLevel("decrease");
			},
//			deleteByCut: event => {
				this.saveUndoState();
			},
*/
			deleteContentBackward: event => {
				Backspace(this, event, this.getSelection());
			},
			deleteContentForward: event => {
				Delete(this, event, this.getSelection());
			}
		}
	}

	// https://developer.mozilla.org/en-US/docs/Web/API/InputEvent/inputType
	// https://github.com/w3c/input-events
	_beforeInput(event) {
		let type = event.inputType;
		// event.getTargetRanges();
		switch (type) {
			case "formatBold":
			case "formatItalic":
			case "formatUnderline":
			case "formatStrikeThrough":
			case "formatSuperscript":
			case "formatSubscript":
				event.preventDefault();
				this[type.slice(6).toLowerCase()]();
				break;
			case "formatJustifyFull":
			case "formatJustifyCenter":
			case "formatJustifyRight":
			case "formatJustifyLeft": {
				event.preventDefault();
				let alignment = type.slice(13).toLowerCase();
				this.setStyle({textAlign:alignment === "full" ? "justify" : alignment});
				break;
			}
			default:
				this._beforeInputTypes[type]?.(event);
		}
	}

	// --- Events

	handleEvent(event) {
		this.fireEvent(event.type, event);
	}

	fireEvent(type, event) {
		let handlers = this._events[type];
		let isFocused, l, obj;
		// UI code, especially modal views, may be monitoring for focus events and
		// immediately removing focus. In certain conditions, this can cause the
		// focus event to fire after the blur event, which can cause an infinite
		// loop. So we detect whether we're actually focused/blurred before firing.
		if (/^(?:focus|blur)/.test(type)) {
			isFocused = this._root === doc.activeElement;
			if (type === "focus") {
				if (!isFocused || this._isFocused) {
					return this;
				}
				this._isFocused = true;
			} else {
				if (isFocused || !this._isFocused) {
					return this;
				}
				this._isFocused = false;
			}
		}
		if (handlers) {
			event = event || {};
			if (event.type !== type) {
				event.type = type;
			}
			// Clone handlers array, so any handlers added/removed do not affect it.
			handlers = handlers.slice();
			l = handlers.length;
			while (l--) {
				obj = handlers[l];
				try {
					obj.handleEvent ? obj.handleEvent(event) : obj.call(this, event);
				} catch (error) {
					error.details = 'Squire: fireEvent error. Event type: ' + type;
					didError(error);
				}
			}
		}
		return this;
	}

	addEventListener(type, fn) {
		type.split(/\s+/).forEach(type=>{
			if (!fn) {
				didError({
					name: 'Squire: addEventListener with null or undefined fn',
					message: 'Event type: ' + type
				});
				return this;
			}
			let handlers = this._events[type];
			if (!handlers) {
				handlers = this._events[type] = [];
				customEvents[type] || this._root.addEventListener(type, this, {capture:true,passive:"touchstart"===type});
			}
			handlers.push(fn);
		});
		return this;
	}

	removeEventListener(type, fn) {
		const handlers = this._events[type];
		let l;
		if (handlers) {
			if (fn) {
				l = handlers.length;
				while (l--) {
					if (handlers[l] === fn) {
						handlers.splice(l, 1);
					}
				}
			} else {
				handlers.length = 0;
			}
			if (!handlers.length) {
				delete this._events[type];
				customEvents[type] || this._root.removeEventListener(type, this, true);
			}
		}
		return this;
	}

	// --- Focus

	focus() {
		this._root.focus({ preventScroll: true });
		return this;
	}

	blur() {
		this._root.blur();
		return this;
	}

	// --- Selection and bookmarking

	// --- Workaround for browsers that can't focus empty text nodes ---
	// WebKit bug: https://bugs.webkit.org/show_bug.cgi?id=15256
	_removeZWS() {
		if (this._mayHaveZWS) {
			removeZWS(this._root);
			this._mayHaveZWS = false;
		}
	}

	_saveRangeToBookmark(range) {
		let [startNode, endNode] = createBookmarkNodes(),
			temp;

		insertNodeInRange(range, startNode);
		range.collapse();
		insertNodeInRange(range, endNode);

		// In a collapsed range, the start is sometimes inserted after the end!
		if (startNode.compareDocumentPosition(endNode) & DOCUMENT_POSITION_PRECEDING) {
			startNode.id = endSelectionId;
			endNode.id = startSelectionId;
			temp = startNode;
			startNode = endNode;
			endNode = temp;
		}

		range.setStartAfter(startNode);
		range.setEndBefore(endNode);
	}

	_getRangeAndRemoveBookmark(range) {
		const root = this._root,
			start = root.querySelector('#' + startSelectionId),
			end = root.querySelector('#' + endSelectionId);

		if (start && end) {
			let startContainer = start.parentNode,
				endContainer = end.parentNode,
				startOffset = indexOf(startContainer.childNodes, start),
				endOffset = indexOf(endContainer.childNodes, end);

			if (startContainer === endContainer) {
				--endOffset;
			}

			detach(start);
			detach(end);

			range = range || doc.createRange();
			range.setStart(startContainer, startOffset);
			range.setEnd(endContainer, endOffset);

			// Merge any text nodes we split
			mergeInlines(startContainer, range);
			if (startContainer !== endContainer) {
				mergeInlines(endContainer, range);
			}

			// If we didn't split a text node, we should move into any adjacent
			// text node to current selection point
			if (range.collapsed) {
				startContainer = range.startContainer;
				if (isTextNode(startContainer)) {
					endContainer = startContainer.childNodes[range.startOffset];
					if (!endContainer || !isTextNode(endContainer)) {
						endContainer =
							startContainer.childNodes[range.startOffset - 1];
					}
					if (isTextNode(endContainer)) {
						range.setStart(endContainer, 0);
						range.collapse(true);
					}
				}
			}
		}
		return range || null;
	}

	// --- Selection and Path ---

	getSelection() {
		let sel = win.getSelection();
		let root = this._root;
		let range, startContainer, endContainer;
		// If not focused, always rely on cached range; another function may
		// have set it but the DOM is not modified until focus again
		if (this._isFocused && sel?.rangeCount) {
			range = sel.getRangeAt(0).cloneRange();
			startContainer = range.startContainer;
			endContainer = range.endContainer;
			// FF can return the range as being inside an <img>. WTF?
			if (startContainer && isLeaf(startContainer)) {
				range.setStartBefore(startContainer);
			}
			if (endContainer && isLeaf(endContainer)) {
				range.setEndBefore(endContainer);
			}
		}
		if (range && root.contains(range.commonAncestorContainer)) {
			this._lastRange = range;
		} else {
			range = this._lastRange;
			// Check the editor is in the live document; if not, the range has
			// probably been rewritten by the browser and is bogus
			if (!doc.contains(range.commonAncestorContainer)) {
				range = null;
			}
		}
		return range || createRange(root.firstChild, 0);
	}

	setSelection(range) {
		this._lastRange = range;
		// If we're setting selection, that automatically, and synchronously,
		// triggers a focus event. So just store the selection and mark it as
		// needing restore on focus.
		if (this._isFocused) {
			const selection = win.getSelection();
			if (selection) {
				selection.setBaseAndExtent(
					range.startContainer,
					range.startOffset,
					range.endContainer,
					range.endOffset
				);
			}
		} else {
			this._restoreSelection = true;
		}
		return this;
	}

	getSelectionClosest(selector) {
		return getClosest(this.getSelection().commonAncestorContainer, this._root, selector);
	}

	// --- Path

	getPath() {
		return this._path;
	}

	_updatePath(range, force) {
		const anchor = range.startContainer,
			focus = range.endContainer;
		if (force || anchor !== this._pathRange.startContainer || focus !== this._pathRange.endContainer) {
			this._pathRange = range.cloneRange();
			let node = anchor === focus ? focus : null,
				newPath = (anchor && focus) ? (node ? this._getPath(focus) : "(selection)") : "";
			if (this._path !== newPath) {
				this._path = newPath;
				this.fireEvent("pathChange", {
					path: newPath,
					element: (!node || isElement(node)) ? node : node.parentElement
				});
			}
		}
		this.fireEvent(range.collapsed ? "cursor" : "select", {
			range
		});
	}

	_getPath(node) {
		const root = this._root;
		let path = "", style;
		if (node && node !== root) {
			path = this._getPath(node.parentNode, root);
			if (isElement(node)) {
				path += (path ? '>' : '') + node.nodeName;
				if (node.id) {
					path += '#' + node.id;
				}
				if (node.dir) {
					path += '[dir=' + node.dir + ']';
				}
				if (style = node.style.cssText) {
					path += '[style=' + style + ']';
				}
			}
		}
		return path;
	}

	// --- History

	_docWasChanged() {
		nodeCategoryCache = new WeakMap();
		this._mayHaveZWS = cantFocusEmptyTextNodes;
		if (this._ignoreChange) {
			this._ignoreChange = false;
		} else {
			this.editStack.docWasChanged();
		}
	}

	/**
	 * Leaves bookmark.
	 */
	_recordUndoState(range, replace) {
		this.editStack.recordUndoState(range, replace);
	}

	saveUndoState(range) {
		this.editStack.saveUndoState(range);
	}

	undo() {
		this.editStack.undo();
//		this.focus();
	}

	redo() {
		this.editStack.redo();
//		this.focus();
	}

	// --- Get and set data

	getRoot() {
		return this._root;
	}

	_getHTML() {
		return this._root.innerHTML;
	}

	// Called by undo() and redo()
	_setHTML(html) {
		if (html !== undefined) {
			const root = this._root;
			let node = root;
			root.innerHTML = html;
			do {
				fixCursor(node);
			} while (node = getNextBlock(node, root));
			this._ignoreChange = true;
		}
	}

	getHTML(withBookMark) {
		let html, range;
		if (withBookMark) {
			range = this.getSelection();
			this._saveRangeToBookmark(range);
		}
		html = this._getHTML().replace(/\u200B/g, "");
		withBookMark && this._getRangeAndRemoveBookmark(range);
		return html;
	}

	setHTML(html) {
		const root = this._root,
			// Parse HTML into DOM tree
			frag = this._config.sanitizeToDOMFragment(html, false);

		cleanTree(frag);
		cleanupBRs(frag, root, false);

		fixContainer(frag, root);

		// Fix cursor
		let node, walker = getBlockWalker(frag, root);
		while ((node = walker.nextNode()) && node !== root) {
			fixCursor(node);
		}

		// Don't fire an input event
		this._ignoreChange = true;

		if (root.replaceChildren) {
			root.replaceChildren(frag);
		} else {
			// Safari < 14
			while (node = root.lastChild) detach(node);
			root.append(frag);
		}
		fixCursor(root);

		// Reset the undo stack
		this.editStack.clear();

		// Record undo state
		const range = this._getRangeAndRemoveBookmark() || createRange(root.firstElementChild || root, 0);
		this.saveUndoState(range);
		this.setRange(range);
		return this;
	}

	/**
	 * Insert HTML at the cursor location. If the selection is not collapsed
	 * insertTreeFragmentIntoRange will delete the selection so that it is
	 * replaced by the html being inserted.
	 */
	insertHTML(html, isPaste) {
		let range = this.getSelection();

		// Edge doesn't just copy the fragment, but includes the surrounding guff
		// including the full <head> of the page. Need to strip this out.
		if (isPaste) {
			let startFragmentIndex = html.indexOf('<!--StartFragment-->'),
				endFragmentIndex = html.lastIndexOf('<!--EndFragment-->');
			if (startFragmentIndex > -1 && endFragmentIndex > -1) {
				html = html.slice(startFragmentIndex + 20, endFragmentIndex);
			}
		}

		let frag = this._config.sanitizeToDOMFragment(html, isPaste);

		// Record undo checkpoint
		this.saveUndoState(range);

		try {
			let root = this._root, node = frag;

			addLinks(frag, frag);
			cleanTree(frag);
			cleanupBRs(frag, root, false);
			removeEmptyInlines(frag);
			frag.normalize();

			while (node = getNextBlock(node, frag)) {
				fixCursor(node);
			}

			insertTreeFragmentIntoRange(range, frag, root);
			range.collapse();

			// After inserting the fragment, check whether the cursor is inside
			// an <a> element and if so if there is an equivalent cursor
			// position after the <a> element. If there is, move it there.
			moveRangeBoundaryOutOf(range, "A", root);

			this._ensureBottomLine();

			this.setRange(range);
			// Safari sometimes loses focus after paste. Weird.
			isPaste && this.focus();
		} catch (error) {
			didError(error);
		}
		return this;
	}

	insertElement(el, range) {
		range = range || this.getSelection();
		range.collapse(true);
		if (isInline(el)) {
			insertNodeInRange(range, el);
			range.setStartAfter(el);
		} else {
			// Get containing block node.
			let root = this._root;
			let splitNode = getStartBlockOfRange(range, root) || root;
			let parent, nodeAfterSplit;
			// While at end of container node, move up DOM tree.
			while (splitNode !== root && !splitNode.nextSibling) {
				splitNode = splitNode.parentNode;
			}
			// If in the middle of a container node, split up to root.
			if (splitNode !== root) {
				parent = splitNode.parentNode;
				nodeAfterSplit = split(parent, splitNode.nextSibling, root, root);
			}
			if (nodeAfterSplit) {
				nodeAfterSplit.before(el);
			} else {
				root.append(el);
				// Insert blank line below block.
				nodeAfterSplit = this.createDefaultBlock();
				root.append(nodeAfterSplit);
			}
			range.setStart(nodeAfterSplit, 0);
			range.setEnd(nodeAfterSplit, 0);
			moveRangeBoundariesDownTree(range);
		}
		this.focus();
		this.setSelection(range);
		this._updatePath(range);

		return this;
	}

	insertImage(src, attributes) {
		const img = createElement("IMG", mergeObjects({
			src: src
		}, attributes, true));
		this.insertElement(img);
		return img;
	}

	insertPlainText(plainText, isPaste) {
		const range = this.getSelection();
		if (range.collapsed && getClosest(range.startContainer, this._root, "PRE")) {
			let node = range.startContainer;
			let offset = range.startOffset;
			let text;
			if (!isTextNode(node)) {
				text = doc.createTextNode('');
				node?.childNodes[offset].before(text);
				node = text;
				offset = 0;
			}

			node.insertData(offset, plainText);
			range.setStart(node, offset + plainText.length);
			range.collapse(true);
			this.setSelection(range);
			return this;
		}
		const lines = plainText.split(/\r?\n/),
			closeBlock = '</' + blockTag + '>',
			openBlock = '<' + blockTag + '>';

		lines.forEach((line, i) => {
			line = escapeHTML(line).replace(/ (?=(?: |$))/g, NBSP);
			// We don't wrap the first line in the block, so if it gets inserted
			// into a blank line it keeps that line's formatting.
			// Wrap each line in <div></div>
			lines[i] = i ? openBlock + (line || '<BR>') + closeBlock : line;
		});
		return this.insertHTML(lines.join(''), isPaste);
	}

	// --- Inline formatting ---

	/**
	 * Extracts the font-family and font-size (if any) of the element
	 * holding the cursor. If there's a selection, returns an empty object.
	 */
	getFontInfo(range) {
		const fontInfo = {
			color: void 0,
			backgroundColor: void 0,
			family: void 0,
			size: void 0
		};
		range = range || this.getSelection();
		let seenAttributes = 0;
		let element = range.commonAncestorContainer, style, attr;
		if (range.collapsed || isTextNode(element)) {
			if (isTextNode(element)) {
				element = element.parentNode;
			}
			while (seenAttributes < 4 && element) {
				if (style = element.style) {
					if (!fontInfo.color && (attr = style.color)) {
						fontInfo.color = attr;
						++seenAttributes;
					}
					if (!fontInfo.backgroundColor && (attr = style.backgroundColor)) {
						fontInfo.backgroundColor = attr;
						++seenAttributes;
					}
					if (!fontInfo.family && (attr = style.fontFamily)) {
						fontInfo.family = attr;
						++seenAttributes;
					}
					if (!fontInfo.size && (attr = style.fontSize)) {
						fontInfo.size = attr;
						++seenAttributes;
					}
				}
				element = element.parentNode;
			}
		}
		return fontInfo;
	}

	/**
	 * Looks for matching tag and attributes, so won't work if <strong>
	 * instead of <b> etc.
	 */
	hasFormat(tag, attributes, range) {
		// 1. Normalise the arguments and get selection
		tag = tag.toUpperCase();
		range = range || this.getSelection()

		// Sanitize range to prevent weird IE artifacts
		if (!range.collapsed && isTextNode(range.startContainer) && range.startOffset === range.startContainer.length && range.startContainer.nextSibling) {
			range.setStartBefore(range.startContainer.nextSibling);
		}
		if (!range.collapsed && isTextNode(range.endContainer) && range.endOffset === 0 && range.endContainer.previousSibling) {
			range.setEndAfter(range.endContainer.previousSibling);
		}

		// If the common ancestor is inside the tag we require, we definitely
		// have the format.
		const root = this._root;
		const common = range.commonAncestorContainer;
		if (getNearest(common, root, tag, attributes)) {
			return true;
		}

		// If common ancestor is a text node and doesn't have the format, we
		// definitely don't have it.
		if (isTextNode(common)) {
			return false;
		}

		// Otherwise, check each text node at least partially contained within
		// the selection and make sure all of them have the format we want.
		const walker = createTreeWalker(common, SHOW_TEXT, node => isNodeContainedInRange(range, node));

		let seenNode = false;
		let node;
		while (node = walker.nextNode()) {
			if (!getNearest(node, root, tag, attributes)) {
				return false;
			}
			seenNode = true;
		}

		return seenNode;
	}

	changeFormat(add, remove, range, partial) {
		// Normalise the arguments and get selection
		range = range || this.getSelection();
		// Save undo checkpoint
		this.saveUndoState(range);

		if (remove) {
			range = this._removeFormat(remove.tag.toUpperCase(),
				remove.attributes || {}, range, partial);
		}

		if (add) {
			range = this._addFormat(add.tag.toUpperCase(),
				add.attributes || {}, range);
		}
		this.setRange(range);
		return this.focus();
	}

	_addFormat(tag, attributes, range) {
		// If the range is collapsed we simply insert the node by wrapping
		// it round the range and focus it.
		const root = this._root;
		let el, walker, startContainer, endContainer, startOffset, endOffset,
			node, block;

		if (range.collapsed) {
			el = fixCursor(createElement(tag, attributes));
			insertNodeInRange(range, el);
			range.setStart(el.firstChild, el.firstChild.length);
			range.collapse(true);

			// Clean up any previous formats that may have been set on this block
			// that are unused.
			block = el;
			while (isInline(block)) {
				block = block.parentNode;
			}
			removeZWS(block, el);
		}
		// Otherwise we find all the textnodes in the range (splitting
		// partially selected nodes) and if they're not already formatted
		// correctly we wrap them in the appropriate tag.
		else {
			// Create an iterator to walk over all the text nodes under this
			// ancestor which are in the range and not already formatted
			// correctly.
			//
			// In Blink/WebKit, empty blocks may have no text nodes, just a <br>.
			// Therefore we wrap this in the tag as well, as this will then cause it
			// to apply when the user types something in the block, which is
			// presumably what was intended.
			//
			// IMG tags are included because we may want to create a link around
			// them, and adding other styles is harmless.
			walker = createTreeWalker(
				range.commonAncestorContainer,
				SHOW_ELEMENT_OR_TEXT,
				node => (isTextNode(node) ||
							isBrElement(node) ||
							node.nodeName === "IMG"
						) && isNodeContainedInRange(range, node)
			);

			// Start at the beginning node of the range and iterate through
			// all the nodes in the range that need formatting.
			startContainer = range.startContainer;
			startOffset = range.startOffset;
			endContainer = range.endContainer;
			endOffset = range.endOffset;

			// Make sure we start with a valid node.
			walker.currentNode = startContainer;
			if (filterAccept != walker.filter.acceptNode(startContainer)) {
				startContainer = walker.nextNode();
				startOffset = 0;
			}

			// If there are interesting nodes in the selection
			if (startContainer) {
				do {
					node = walker.currentNode;
					if (!getNearest(node, root, tag, attributes)) {
						// <br> can never be a container node, so must have a text node
						// if node == (end|start)Container
						if (node === endContainer && node.length > endOffset) {
							node.splitText(endOffset);
						}
						if (node === startContainer && startOffset) {
							node = node.splitText(startOffset);
							if (endContainer === startContainer) {
								endContainer = node;
								endOffset -= startOffset;
							}
							startContainer = node;
							startOffset = 0;
						}
						el = createElement(tag, attributes);
						node.replaceWith(el);
						el.append(node);
					}
				} while (walker.nextNode());

				// If we don't finish inside a text node, offset may have changed.
				if (!isTextNode(endContainer)) {
					if (isTextNode(node)) {
						endContainer = node;
						endOffset = node.length;
					} else {
						// If <br>, we must have just wrapped it, so it must have only
						// one child
						endContainer = node.parentNode;
						endOffset = 1;
					}
				}

				// Now set the selection to as it was before
				range = createRange(
					startContainer,
					startOffset,
					endContainer,
					endOffset
				);
			}
		}
		return range;
	}

	_removeFormat(tag, attributes, range, partial) {
		// Add bookmark
		this._saveRangeToBookmark(range);

		// We need a node in the selection to break the surrounding
		// formatted text.
		let fixer;
		if (range.collapsed) {
			this._mayHaveZWS = cantFocusEmptyTextNodes;
			fixer = doc.createTextNode(cantFocusEmptyTextNodes ? ZWS : "");
			insertNodeInRange(range, fixer);
		}

		// Find block-level ancestor of selection
		let root = range.commonAncestorContainer;
		while (isInline(root)) {
			root = root.parentNode;
		}

		// Find text nodes inside formatTags that are not in selection and
		// add an extra tag with the same formatting.
		const startContainer = range.startContainer,
			startOffset = range.startOffset,
			endContainer = range.endContainer,
			endOffset = range.endOffset,
			toWrap = [],
			examineNode = (node, exemplar) => {
				// If the node is completely contained by the range then
				// we're going to remove all formatting so ignore it.
				if (isNodeContainedInRange(range, node, false)) {
					return;
				}

				let isText = isTextNode(node),
					child, next;

				// If not at least partially contained, wrap entire contents
				// in a clone of the tag we're removing and we're done.
				if (!isNodeContainedInRange(range, node)) {
					// Ignore bookmarks and empty text nodes
					if (node.nodeName !== "INPUT" && (!isText || node.data)) {
						toWrap.push([exemplar, node]);
					}
					return;
				}

				// Split any partially selected text nodes.
				if (isText) {
					if (node === endContainer && endOffset !== node.length) {
						toWrap.push([exemplar, node.splitText(endOffset)]);
					}
					if (node === startContainer && startOffset) {
						node.splitText(startOffset);
						toWrap.push([exemplar, node]);
					}
				}
				// If not a text node, recurse onto all children.
				// Beware, the tree may be rewritten with each call
				// to examineNode, hence find the next sibling first.
				else {
					for (child = node.firstChild; child; child = next) {
						next = child.nextSibling;
						examineNode(child, exemplar);
					}
				}
			},
			formatTags = Array.prototype.filter.call(
				root.getElementsByTagName(tag),
				el => isNodeContainedInRange(range, el) && hasTagAttributes(el, tag, attributes)
			);

		partial || formatTags.forEach(node => examineNode(node, node));

		// Now wrap unselected nodes in the tag
		toWrap.forEach(([el, node]) => {
			el = el.cloneNode(false);
			node.replaceWith(el);
			el.append(node);
		});
		// and remove old formatting tags.
		formatTags.forEach(el => el.replaceWith(empty(el)));

		// Merge adjacent inlines:
		if (cantFocusEmptyTextNodes && fixer) {
			fixer = fixer.parentNode;
			let block = fixer;
			while (block && isInline(block)) {
				block = block.parentNode;
			}
			if (block) {
				removeZWS(block, fixer);
			}
		}
		this._getRangeAndRemoveBookmark(range);
		fixer && range.collapse();
		mergeInlines(root, range);

		return range;
	}

	// ---
	bold() { this.toggleTag("B"); }
	italic() { this.toggleTag("I"); }
	underline() { this.toggleTag("U"); }
	strikethrough() { this.toggleTag("S"); }
	subscript() { this.toggleTag("SUB", "SUP"); }
	superscript() { this.toggleTag("SUP", "SUB"); }

	makeLink(url, attributes) {
		const range = this.getSelection();
		if (range.collapsed) {
			insertNodeInRange(
				range,
				doc.createTextNode(url.replace(/^[^:]*:\/*/, ''))
			);
		}
		attributes = mergeObjects(
			mergeObjects({
				href: url
			}, attributes, true),
			null,
			false
		);

		return this.changeFormat(
			{
				tag: "A",
				attributes: attributes
			},
			{
				tag: "A"
			},
			range
		);
	}

	removeLink() {
		return this.changeFormat(
			null,
			{
				tag: "A"
			},
			this.getSelection(),
			true
		);
	}

	// --- Block formatting

	_ensureBottomLine() {
		const root = this._root;
		const last = root.lastElementChild;
		if (!last || last.nodeName !== blockTag || !isBlock(last)) {
			root.append(this.createDefaultBlock());
		}
	}

	createDefaultBlock(children) {
		return fixCursor(
			createElement(blockTag, null, children)
		);
	}

	splitBlock(lineBreakOnly, range) {
		range = range || this.getSelection();

		const root = this._root;
		let block;
		let parent;
		let node;
		let nodeAfterSplit;

		// TODO: why was _docWasChanged() not triggered?
		this.editStack.inUndoState && this._docWasChanged();
		this._recordUndoState(range);
//		this._config.addLinks && addLinks(range.startContainer, root);
		this._removeZWS();
		this._getRangeAndRemoveBookmark(range);

		if (!range.collapsed) {
			deleteContentsOfRange(range, root);
		}
		if (this._config.addLinks) {
			moveRangeBoundariesDownTree(range);
//			const textNode = range.startContainer;
//			const offset2 = range.startOffset;
			setTimeout(() => {
//				linkifyText(this, textNode, offset2);
				addLinks(range.startContainer, this._root);
			}, 0);
		}
		block = getStartBlockOfRange(range, root);
		if (block && (parent = getClosest(block, root, "PRE"))) {
			// TODO: also check style="white-space:pre*" ?
			moveRangeBoundariesDownTree(range);
			node = range.startContainer;
			const offset2 = range.startOffset;
			if (!isTextNode(node)) {
				node = doc.createTextNode("");
				parent.insertBefore(node, parent.firstChild);
			}
			if (!lineBreakOnly && isTextNode(node) && (node.data.charAt(offset2 - 1) === "\n" || rangeDoesStartAtBlockBoundary(range, root)) && (node.data.charAt(offset2) === "\n" || rangeDoesEndAtBlockBoundary(range, root))) {
				node.deleteData(offset2 && offset2 - 1, offset2 ? 2 : 1);
				nodeAfterSplit = split(
					node,
					offset2 && offset2 - 1,
					root,
					root
				);
				node = nodeAfterSplit.previousSibling;
				if (!node.textContent) {
					detach(node);
				}
				node = this.createDefaultBlock();
				nodeAfterSplit.before(node);
				if (!nodeAfterSplit.textContent) {
					detach(nodeAfterSplit);
				}
				range.setStart(node, 0);
			} else {
				node.insertData(offset2, "\n");
				fixCursor(parent);
				// Firefox bug: if you set the selection in the text node after
				// the new line, it draws the cursor before the line break still
				// but if you set the selection to the equivalent position
				// in the parent, it works.
				if (node.length === offset2 + 1) {
					range.setStartAfter(node);
				} else {
					range.setStart(node, offset2 + 1);
				}
			}
			range.collapse(true);
			this.setRange(range);
			this._docWasChanged();
			return;
		}
		// If this is a malformed bit of document or in a table;
		// just play it safe and insert a <br>.
		if (!block || lineBreakOnly || /^T[HD]$/.test(block.nodeName)) {
			moveRangeBoundaryOutOf(range, "A", root);
			insertNodeInRange(range, createElement("BR"));
			range.collapse();
			this.setRange(range);
			return;
		}
		block = getClosest(block, root, "LI") || block;
		if (isEmptyBlock(block) && (parent = getClosest(block, root, "UL,OL,BLOCKQUOTE"))) {
			return "BLOCKQUOTE" === parent.nodeName
				// Break blockquote
				? this.modifyBlocks((/* frag */) => this.createDefaultBlock(createBookmarkNodes()), range)
				// Break list
				: this.decreaseListLevel(range);
		}
		node = range.startContainer;
		const offset = range.startOffset;
		let splitTag = tagAfterSplit[block.nodeName] || blockTag;
		nodeAfterSplit = split(
			node,
			offset,
			block.parentNode,
			root
		);
		if (!hasTagAttributes(nodeAfterSplit, splitTag)) {
			block = createElement(splitTag);
			if (nodeAfterSplit.dir) {
				block.dir = nodeAfterSplit.dir;
			}
			nodeAfterSplit.replaceWith(block);
			block.append(empty(nodeAfterSplit));
			nodeAfterSplit = block;
		}
		removeZWS(block);
		removeEmptyInlines(block);
		fixCursor(block);
		while (isElement(nodeAfterSplit)) {
			let child = nodeAfterSplit.firstChild;
			let next;
			if (nodeAfterSplit.nodeName === "A" && (!nodeAfterSplit.textContent || nodeAfterSplit.textContent === ZWS)) {
				child = doc.createTextNode("");
				nodeAfterSplit.replaceWith(child);
				nodeAfterSplit = child;
				break;
			}
			while (isTextNode(child) && !child.data) {
				next = child.nextSibling;
				if (!next || isBrElement(next)) {
					break;
				}
				detach(child);
				child = next;
			}
			if (!child || isBrElement(child) || isTextNode(child)) {
				break;
			}
			nodeAfterSplit = child;
		}
		range = createRange(nodeAfterSplit, 0);
		this.setRange(range);
	}

	modifyBlocks(modify, range) {
		range = range || this.getSelection();
		// 1. Save undo checkpoint and bookmark selection
		this._recordUndoState(range, true);

		const root = this._root;

		// 2. Expand range to block boundaries
		expandRangeToBlockBoundaries(range, root);

		// 3. Remove range.
		moveRangeBoundariesUpTree(range, root, root, root);
		const frag = extractContentsOfRange(range, root, root);

		// 4. Modify tree of fragment and reinsert.
		insertNodeInRange(range, modify.call(this, frag));

		// 5. Merge containers at edges
		if (range.endOffset < range.endContainer.childNodes.length) {
			mergeContainers(
				range.endContainer.childNodes[range.endOffset],
				root
			);
		}
		mergeContainers(
			range.startContainer.childNodes[range.startOffset],
			root
		);

		// 6. Restore selection
		this._getRangeAndRemoveBookmark(range);
		this.setRange(range);
		return this;
	}

	increaseListLevel(range) {
		range = range || this.getSelection();
		const root = this._root;
		const listSelection = getListSelection(range, root);
		if (listSelection) {
			let [list, startLi, endLi] = listSelection;
			if (startLi && startLi !== list.firstChild) {
				// Save undo checkpoint and bookmark selection
				this._recordUndoState(range, true);

				// Increase list depth
				const type = list.nodeName;
				let newParent = startLi.previousSibling;
				let next;
				if (newParent.nodeName !== type) {
					newParent = createElement(type);
					startLi.before(newParent);
				}
				do {
					next = startLi === endLi ? null : startLi.nextSibling;
					newParent.append(startLi);
				} while (startLi = next);
				next = newParent.nextSibling;
				next && mergeContainers(next, root);

				// Restore selection
				this._getRangeAndRemoveBookmark(range);
				this.setRange(range);
			}
		}
		return this.focus();
	}

	decreaseListLevel(range) {
		range = range || this.getSelection();
		const root = this._root;
		const listSelection = getListSelection(range, root);
		if (listSelection) {
			let list = listSelection[0];
			let startLi = listSelection[1] || list.firstChild;
			let endLi = listSelection[2] || list.lastChild;
			let newParent, next, insertBefore, makeNotList;

			// Save undo checkpoint and bookmark selection
			this._recordUndoState(range, true);

			if (startLi) {
				// Find the new parent list node
				newParent = list.parentNode;

				// Split list if necesary
				insertBefore = !endLi.nextSibling ?
					list.nextSibling :
					split(list, endLi.nextSibling, newParent, root);

				if (newParent !== root && newParent.nodeName === "LI") {
					newParent = newParent.parentNode;
					while (insertBefore) {
						next = insertBefore.nextSibling;
						endLi.append(insertBefore);
						insertBefore = next;
					}
					insertBefore = list.parentNode.nextSibling;
				}

				makeNotList = !/^[OU]L$/.test(newParent.nodeName);
				do {
					next = startLi === endLi ? null : startLi.nextSibling;
					startLi.remove();
					if (makeNotList && startLi.nodeName === "LI") {
						startLi = this.createDefaultBlock([empty(startLi)]);
					}
					newParent.insertBefore(startLi, insertBefore);
				} while (startLi = next);
			}

			list.firstChild || detach(list);

			insertBefore && mergeContainers(insertBefore, root);

			// Restore selection
			this._getRangeAndRemoveBookmark(range);
			this.setRange(range);
		}
		return this.focus();
	}

	makeUnorderedList() {
		return this.modifyBlocks(frag => makeList(this, frag, "UL")).focus();
	}

	makeOrderedList() {
		return this.modifyBlocks(frag => makeList(this, frag, "OL")).focus();
	}

	removeList() {
		return this.modifyBlocks(frag => {
			let root = this._root,
				listFrag;
			frag.querySelectorAll('UL, OL').forEach(list => {
				listFrag = empty(list);
				fixContainer(listFrag, root);
				list.replaceWith(listFrag);
			});

			frag.querySelectorAll("LI").forEach(item => {
				if (isBlock(item)) {
					item.replaceWith(this.createDefaultBlock([empty(item)]));
				} else {
					fixContainer(item, root);
					item.replaceWith(empty(item));
				}
			});

			return frag;
		}).focus();
	}

	// ---

	increaseQuoteLevel(range) {
		return this.modifyBlocks(
			frag => createElement(
				"BLOCKQUOTE",
				null,
				[frag]
			),
			range
		).focus();
	}

	decreaseQuoteLevel(range) {
		return this.modifyBlocks(
			frag => {
				Array.prototype.filter.call(frag.querySelectorAll("blockquote"), el =>
					!getClosest(el.parentNode, frag, "BLOCKQUOTE")
				).forEach(el =>
					el.replaceWith(empty(el))
				);
				return frag;
			},
			range
		).focus();
	}

	// ---

	code() {
		let range = this.getSelection();
		if (range.collapsed || isContainer(range.commonAncestorContainer)) {
			return this.modifyBlocks(frag => {
				let root = this._root;
				let output = doc.createDocumentFragment();
				let walker = getBlockWalker(frag, root);
				let node;
				// 1. Extract inline content; drop all blocks and contains.
				while (node = walker.nextNode()) {
					// 2. Replace <br> with \n in content
					node.querySelectorAll("BR").forEach(br => {
						if (!isLineBreak(br, false)) {
							detach(br);
						} else {
							br.replaceWith(doc.createTextNode("\n"));
						}
					});
					// 3. Remove <code>; its format clashes with <pre>
					node.querySelectorAll("CODE").forEach(el => detach(el));
					if (output.childNodes.length) {
						output.append(doc.createTextNode("\n"));
					}
					output.append(empty(node));
				}
				// 4. Replace nbsp with regular sp
				walker = createTreeWalker(output, SHOW_TEXT);
				while (node = walker.nextNode()) {
					node.data = node.data.replace(NBSP, ' '); // nbsp -> sp
				}
				output.normalize();
				return fixCursor(
					createElement("PRE", null, [
						output
					])
				);
			}, range).focus();
		}
		return this.changeFormat({ tag: "CODE" }, null, range);
	}

	removeCode() {
		let range = this.getSelection();
		let ancestor = range.commonAncestorContainer;
		let inPre = getClosest(ancestor, this._root, "PRE");
		if (inPre) {
			return this.modifyBlocks(frag => {
				let root = this._root;
				let pres = frag.querySelectorAll("PRE");
				let l = pres.length;
				let pre, walker, node, value, contents, index;
				while (l--) {
					pre = pres[l];
					walker = createTreeWalker(pre, SHOW_TEXT);
					while (node = walker.nextNode()) {
						value = node.data;
						value = value.replace(/ (?=)/g, NBSP); // sp -> nbsp
						contents = doc.createDocumentFragment();
						while ((index = value.indexOf("\n")) > -1) {
							contents.append(
								doc.createTextNode(value.slice(0, index))
							);
							contents.append(createElement("BR"));
							value = value.slice(index + 1);
						}
						node.before(contents);
						node.data = value;
					}
					fixContainer(pre, root);
					pre.replaceWith(empty(pre));
				}
				return frag;
			}, range).focus();
		}
		return this.changeFormat(null, { tag: "CODE" }, range);
	}

	toggleCode() {
		return (this.hasFormat("PRE") || this.hasFormat("CODE"))
			? this.removeCode()
			: this.code();
	}

	toggleTag(name, remove) {
		let range = this.getSelection();
		if (this.hasFormat(name, null, range)) {
			this.changeFormat(null, { tag: name }, range);
		} else {
			this.changeFormat({ tag: name }, remove ? { tag: remove } : null, range);
		}
	}

	// --- Formatting ---

	setStyle(style) {
		this.setAttribute("style", style);
	}

	setAttribute(name, value) {
		let range = this.getSelection();
		let start = range?.startContainer || {};
		let end = range ? range.endContainer : 0;
		// When the selection is all the text inside an element, set style on the element itself
		if ("dir" == name || (isTextNode(start) && 0 === range.startOffset && start === end && end.length === range.endOffset)) {
			this._recordUndoState(range);
			setAttributes(start.parentNode, {[name]: value});
//			this.setRange(range);
			this._docWasChanged();
		}
		// Else when it should remove the attribute
		else if (null == value) {
			this._recordUndoState(range);
			let node = getClosest(range.commonAncestorContainer, this._root, '*');
			range.collapsed
				? setAttributes(node, {[name]: value})
				: node.querySelectorAll('*').forEach(el => setAttributes(el, {[name]: value}));
//			this.setRange(range);
			this._docWasChanged();
		}
		// Else create a span element
		else {
			this.changeFormat({
				tag: "SPAN",
				attributes: {[name]: value}
			}, null, range);
		}
		return this.focus();
	}

	// ---

	changeIndentationLevel(direction) {
		let parent = this.getSelectionClosest('UL,OL,BLOCKQUOTE');
		if (parent || "increase" === direction) {
			let method = (!parent || "BLOCKQUOTE" === parent.nodeName) ? "Quote" : "List";
			return this[direction + method + "Level"]();
		}
	}

	bidi(dir) {
		return this.modifyBlocks(frag => setDirection(this, frag, dir)).focus();
	}

	setRange(range) {
		this.setSelection(range);
		// Path may have changed
		this._updatePath(range, true);
	}

	setConfig(config) {
		this._config = mergeObjects({
			addLinks: true
		}, config, true);
		return this;
	}
}

win.Squire = Squire;

})(document);
