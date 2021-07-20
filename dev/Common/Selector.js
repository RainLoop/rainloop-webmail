import ko from 'ko';
import { isArray } from 'Common/Utils';

/*
	oCallbacks:
		ItemSelect
		MiddleClick
		AutoSelect
		ItemGetUid
		UpOrDown
*/

export class Selector {
	/**
	 * @param {koProperty} koList
	 * @param {koProperty} koSelectedItem
	 * @param {koProperty} koFocusedItem
	 * @param {string} sItemSelector
	 * @param {string} sItemCheckedSelector
	 * @param {string} sItemFocusedSelector
	 */
	constructor(
		koList,
		koSelectedItem,
		koFocusedItem,
		sItemSelector,
		sItemCheckedSelector,
		sItemFocusedSelector
	) {
		this.list = koList;
		this.listChecked = ko.computed(() => this.list.filter(item => item.checked())).extend({ rateLimit: 0 });
		this.isListChecked = ko.computed(() => 0 < this.listChecked().length);

		this.focusedItem = koFocusedItem || ko.observable(null);
		this.selectedItem = koSelectedItem || ko.observable(null);

		this.selectedItemUseCallback = true;

		this.iSelectNextHelper = 0;
		this.iFocusedNextHelper = 0;
		this.oContentScrollable;

		this.sItemSelector = sItemSelector;
		this.sItemCheckedSelector = sItemCheckedSelector;
		this.sItemFocusedSelector = sItemFocusedSelector;

		this.sLastUid = '';
		this.oCallbacks = {};

		const itemSelectedThrottle = (item => this.itemSelected(item)).debounce(300);

		this.listChecked.subscribe((items) => {
			if (items.length) {
				if (null === this.selectedItem()) {
					if (this.selectedItem.valueHasMutated) {
						this.selectedItem.valueHasMutated();
					}
				} else {
					this.selectedItem(null);
				}
			} else if (this.autoSelect() && this.focusedItem()) {
				this.selectedItem(this.focusedItem());
			}
		}, this);

		this.selectedItem.subscribe((item) => {
			if (item) {
				if (this.isListChecked()) {
					this.listChecked().forEach(subItem => subItem.checked(false));
				}

				if (this.selectedItemUseCallback) {
					itemSelectedThrottle(item);
				}
			} else if (this.selectedItemUseCallback) {
				this.itemSelected(null);
			}
		}, this);

		this.selectedItem = this.selectedItem.extend({ toggleSubscribeProperty: [this, 'selected'] });
		this.focusedItem = this.focusedItem.extend({ toggleSubscribeProperty: [null, 'focused'] });

		this.focusedItem.subscribe(item => item && (this.sLastUid = this.getItemUid(item)), this);

		let aCache = [],
			aCheckedCache = [],
			mFocused = null,
			mSelected = null;

		this.list.subscribe(
			items => {
				if (isArray(items)) {
					items.forEach(item => {
						if (item) {
							const uid = this.getItemUid(item);

							aCache.push(uid);
							item.checked() && aCheckedCache.push(uid);
							if (null === mFocused && item.focused()) {
								mFocused = uid;
							}
							if (null === mSelected && item.selected()) {
								mSelected = uid;
							}
						}
					});
				}
			},
			this,
			'beforeChange'
		);

		this.list.subscribe((aItems) => {
			let temp = null,
				getNext = false,
				isNextFocused = mFocused,
				isChecked = false,
				isSelected = false,
				len = 0;

			const uids = [];

			this.selectedItemUseCallback = false;

			this.focusedItem(null);
			this.selectedItem(null);

			if (isArray(aItems)) {
				len = aCheckedCache.length;

				aItems.forEach(item => {
					const uid = this.getItemUid(item);
					uids.push(uid);

					if (null !== mFocused && mFocused === uid) {
						this.focusedItem(item);
						mFocused = null;
					}

					if (0 < len && aCheckedCache.includes(uid)) {
						isChecked = true;
						item.checked(true);
						--len;
					}

					if (!isChecked && null !== mSelected && mSelected === uid) {
						isSelected = true;
						this.selectedItem(item);
						mSelected = null;
					}
				});

				this.selectedItemUseCallback = true;

				if (!isChecked && !isSelected && this.autoSelect()) {
					if (this.focusedItem()) {
						this.selectedItem(this.focusedItem());
					} else if (aItems.length) {
						if (null !== isNextFocused) {
							getNext = false;
							isNextFocused = aCache.find(sUid => {
								if (getNext && uids.includes(sUid)) {
									return sUid;
								}
								if (isNextFocused === sUid) {
									getNext = true;
								}
								return false;
							});

							if (isNextFocused) {
								temp = aItems.find(oItem => isNextFocused === this.getItemUid(oItem));
							}
						}

						this.selectedItem(temp || null);
						this.focusedItem(this.selectedItem());
					}
				}

				if (
					(0 !== this.iSelectNextHelper || 0 !== this.iFocusedNextHelper) &&
					aItems.length &&
					!this.focusedItem()
				) {
					temp = null;
					if (0 !== this.iFocusedNextHelper) {
						temp = aItems[-1 === this.iFocusedNextHelper ? aItems.length - 1 : 0] || null;
					}

					if (!temp && 0 !== this.iSelectNextHelper) {
						temp = aItems[-1 === this.iSelectNextHelper ? aItems.length - 1 : 0] || null;
					}

					if (temp) {
						if (0 !== this.iSelectNextHelper) {
							this.selectedItem(temp || null);
						}

						this.focusedItem(temp || null);

						this.scrollToFocused();

						setTimeout(this.scrollToFocused, 100);
					}

					this.iSelectNextHelper = 0;
					this.iFocusedNextHelper = 0;
				}
			}

			aCache = [];
			aCheckedCache = [];
			mFocused = null;
			mSelected = null;
		});
	}

	itemSelected(item) {
		if (this.isListChecked()) {
			item || (this.oCallbacks.ItemSelect || (()=>{}))(null);
		} else if (item) {
			(this.oCallbacks.ItemSelect || (()=>{}))(item);
		}
	}

	unselect() {
		this.selectedItem(null);
		this.focusedItem(null);
	}

	init(contentScrollable, keyScope = 'all') {
		this.oContentScrollable = contentScrollable;

		if (contentScrollable) {
			let getItem = selector => {
				let el = event.target.closestWithin(selector, contentScrollable);
				return el ? ko.dataFor(el) : null;
			};

			contentScrollable.addEventListener('click', event => {
				let el = event.target.closestWithin(this.sItemSelector, contentScrollable);
				el && this.actionClick(ko.dataFor(el), event);

				const item = getItem(this.sItemCheckedSelector);
				if (item) {
					if (event.shiftKey) {
						this.actionClick(item, event);
					} else {
						this.focusedItem(item);
						item.checked(!item.checked());
					}
				}
			});

			contentScrollable.addEventListener('auxclick', event => {
				if (1 == event.button) {
					const item = getItem(this.sItemSelector);
					if (item) {
						this.focusedItem(item);
						(this.oCallbacks.MiddleClick || (()=>{}))(item);
					}
				}
			});

			shortcuts.add('enter,open', '', keyScope, () => {
				const focused = this.focusedItem();
				if (focused && !focused.selected()) {
					this.actionClick(focused);
					return false;
				}

				return true;
			});

			shortcuts.add('arrowup,arrowdown', 'meta', keyScope, () => false);

			shortcuts.add('arrowup,arrowdown', 'shift', keyScope, event => {
				this.newSelectPosition(event.key, true);
				return false;
			});
			shortcuts.add('arrowup,arrowdown,home,end,pageup,pagedown,space', '', keyScope, event => {
				this.newSelectPosition(event.key, false);
				return false;
			});
		}
	}

	/**
	 * @returns {boolean}
	 */
	autoSelect() {
		return !!(this.oCallbacks.AutoSelect || (()=>true))();
	}

	/**
	 * @param {Object} oItem
	 * @returns {string}
	 */
	getItemUid(item) {
		let uid = '';

		const getItemUidCallback = this.oCallbacks.ItemGetUid || null;
		if (getItemUidCallback && item) {
			uid = getItemUidCallback(item);
		}

		return uid.toString();
	}

	/**
	 * @param {string} sEventKey
	 * @param {boolean} bShiftKey
	 * @param {boolean=} bForceSelect = false
	 */
	newSelectPosition(sEventKey, bShiftKey, bForceSelect) {
		let isArrow = 'ArrowUp' === sEventKey || 'ArrowDown' === sEventKey,
			result = null;

		const pageStep = 10,
			list = this.list(),
			listLen = list.length,
			focused = this.focusedItem();

		if (listLen) {
			if (focused) {
				if (isArrow) {
					let i = list.indexOf(focused);
					if ('ArrowUp' == sEventKey) {
						i > 0 && (result = list[i-1]);
					} else if (++i < listLen) {
						result = list[i];
					}
					result || (this.oCallbacks.UpOrDown || (()=>true))('ArrowUp' === sEventKey);
				} else if ('Home' === sEventKey) {
					result = list[0];
				} else if ('End' === sEventKey) {
					result = list[list.length - 1];
				} else if ('PageDown' === sEventKey) {
					let i = list.indexOf(focused);
					if (i < listLen - 1) {
						result = list[Math.min(i + pageStep, listLen - 1)];
					}
				} else if ('PageUp' === sEventKey) {
					let i = list.indexOf(focused);
					if (i > 0) {
						result = list[Math.max(0, i - pageStep)];
					}
				}
			} else if (
				'Home' == sEventKey ||
				'PageUp' == sEventKey
			) {
				result = list[0];
			} else if (
				'End' === sEventKey ||
				'PageDown' === sEventKey
			) {
				result = list[list.length - 1];
			}
		}

		if (result) {
			this.focusedItem(result);

			if (focused && ((bShiftKey && isArrow) || ' ' === sEventKey)) {
				focused.checked(!focused.checked());
			}

			if (' ' !== sEventKey && (this.autoSelect() || bForceSelect) && !this.isListChecked()) {
				this.selectedItem(result);
			}

			this.scrollToFocused();
		} else if (focused) {
			if ((bShiftKey && isArrow) || ' ' === sEventKey) {
				focused.checked(!focused.checked());
			}

			this.focusedItem(focused);
		}
	}

	/**
	 * @returns {boolean}
	 */
	scrollToFocused() {
		const scrollable = this.oContentScrollable;
		if (scrollable) {
			let block, focused = scrollable.querySelector(this.sItemFocusedSelector);
			if (focused) {
				const fRect = focused.getBoundingClientRect(),
					sRect = scrollable.getBoundingClientRect();
				if (fRect.top < sRect.top) {
					block = 'start';
				} else if (fRect.bottom > sRect.bottom) {
					block = 'end';
				}
				block && focused.scrollIntoView(block === 'start');
			} else {
				scrollable.scrollTop = 0;
			}
		}
	}

	/**
	 * @returns {boolean}
	 */
	scrollToTop() {
		this.oContentScrollable && (this.oContentScrollable.scrollTop = 0);
	}

	eventClickFunction(item, event) {
		let index = 0,
			length = 0,
			changeRange = false,
			isInRange = false,
			list = [],
			checked = false,
			listItem = null,
			lineUid = '';

		const uid = this.getItemUid(item);
		if (event && event.shiftKey) {
			if (uid && this.sLastUid && uid !== this.sLastUid) {
				list = this.list();
				checked = item.checked();

				for (index = 0, length = list.length; index < length; index++) {
					listItem = list[index];
					lineUid = this.getItemUid(listItem);

					changeRange = false;
					if (lineUid === this.sLastUid || lineUid === uid) {
						changeRange = true;
					}

					if (changeRange) {
						isInRange = !isInRange;
					}

					if (isInRange || changeRange) {
						listItem.checked(checked);
					}
				}
			}
		}

		this.sLastUid = uid || '';
	}

	/**
	 * @param {Object} item
	 * @param {Object=} event
	 */
	actionClick(item, event = null) {
		if (item) {
			let click = true;
			if (event) {
				if (event.shiftKey && !(event.ctrlKey || event.metaKey) && !event.altKey) {
					click = false;
					if (!this.sLastUid) {
						this.sLastUid = this.getItemUid(item);
					}

					item.checked(!item.checked());
					this.eventClickFunction(item, event);

					this.focusedItem(item);
				} else if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
					click = false;
					this.focusedItem(item);

					if (this.selectedItem() && item !== this.selectedItem()) {
						this.selectedItem().checked(true);
					}

					item.checked(!item.checked());
				}
			}

			if (click) {
				this.selectMessageItem(item);
			}
		}
	}

	on(eventName, callback) {
		this.oCallbacks[eventName] = callback;
	}

	selectMessageItem(messageItem) {
		this.focusedItem(messageItem);
		this.selectedItem(messageItem);
		this.scrollToFocused();
	}
}
