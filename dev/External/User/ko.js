import 'External/ko';
import ko from 'ko';
import { HtmlEditor } from 'Common/Html';
import { timeToNode } from 'Common/Translator';
import { elementById, addEventsListeners, dropdowns } from 'Common/Globals';
import { dropdownsDetectVisibility } from 'Common/UtilsUser';
import { EmailAddressesComponent } from 'Component/EmailAddresses';
import { ThemeStore } from 'Stores/Theme';
import { moveMessagesToFolder } from 'Common/Folders';
import { setExpandedFolder } from 'Model/FolderCollection';

const rlContentType = 'snappymail/action',

	// In Chrome we have no access to dataTransfer.getData unless it's the 'drop' event
	// In Chrome Mobile dataTransfer.types.includes(rlContentType) fails, only text/plain is set
	dragMessages = () => 'messages' === dragData?.action,
	dragSortable = () => 'sortable' === dragData?.action,
	setDragAction = (e, action, effect, data, img) => {
		dragData = {
			action: action,
			data: data
		};
//		e.dataTransfer.setData(rlContentType, action);
		e.dataTransfer.setData('text/plain', rlContentType+'/'+action);
		e.dataTransfer.setDragImage(img, 0, 0);
		e.dataTransfer.effectAllowed = effect;
	},

	dragTimer = {
		id: 0,
		stop: () => clearTimeout(dragTimer.id),
		start: fn => dragTimer.id = setTimeout(fn, 500)
	},

	ttn = (element, fValueAccessor) => timeToNode(element, ko.unwrap(fValueAccessor()));

let dragImage,
	dragData;

Object.assign(ko.bindingHandlers, {

	editor: {
		init: (element, fValueAccessor) => {
			let editor = null;

			const fValue = fValueAccessor(),
				fUpdateEditorValue = () => fValue?.__editor?.setHtmlOrPlain(fValue()),
				fUpdateKoValue = () => fValue?.__editor && fValue(fValue.__editor.getDataWithHtmlMark()),
				fOnReady = () => {
					fValue.__editor = editor;
					fUpdateEditorValue();
				};

			if (ko.isObservable(fValue)) {
				editor = new HtmlEditor(element, fUpdateKoValue, fOnReady, fUpdateKoValue);

				fValue.__fetchEditorValue = fUpdateKoValue;

				fValue.subscribe(fUpdateEditorValue);

				// ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
				// });
			}
		}
	},

	moment: {
		init: ttn,
		update: ttn
	},

	emailsTags: {
		init: (element, fValueAccessor, fAllBindings) => {
			const fValue = fValueAccessor(),
				focused = fValue.focused;

			element.addresses = new EmailAddressesComponent(element, {
				focusCallback: value => focused?.(!!value),
				autoCompleteSource: fAllBindings.get('autoCompleteSource'),
				onChange: value => fValue(value)
			});

			focused?.subscribe(value =>
				element.addresses[value ? 'focus' : 'blur']()
			);
		},
		update: (element, fValueAccessor) => {
			element.addresses.value = ko.unwrap(fValueAccessor());
		}
	},

	// Start dragging selected messages
	dragmessages: {
		init: (element, fValueAccessor) => {
			element.addEventListener("dragstart", e => {
				let data = fValueAccessor()(e);
				dragImage || (dragImage = elementById('messagesDragImage'));
				if (data && dragImage && !ThemeStore.isMobile()) {
					dragImage.querySelector('.text').textContent = data.size;
					let img = dragImage.querySelector('i');
					img.classList.toggle('icon-copy', e.ctrlKey);
					img.classList.toggle('icon-mail', !e.ctrlKey);

					// Else Chrome doesn't show it
					dragImage.style.left = e.clientX + 'px';
					dragImage.style.top = e.clientY + 'px';
					dragImage.style.right = 'auto';

					setDragAction(e, 'messages', data.copy ? 'copy' : 'move', data, dragImage);

					// Remove the Chrome visibility
					dragImage.style.cssText = '';
				} else {
					e.preventDefault();
				}

			}, false);
			element.addEventListener("dragend", () => dragData = null);
		}
	},

	// Drop selected messages on folder
	dropmessages: {
		init: (element, fValueAccessor) => {
			const folder = fValueAccessor(),
	//			folder = ko.dataFor(element),
				fnStop = e => {
					e.preventDefault();
					element.classList.remove('droppableHover');
					dragTimer.stop();
				},
				fnHover = e => {
					if (dragMessages()) {
						fnStop(e);
						element.classList.add('droppableHover');
						if (folder?.collapsed()) {
							dragTimer.start(() => {
								folder.collapsed(false);
								setExpandedFolder(folder.fullName, true);
							}, 500);
						}
					}
				};
			addEventsListeners(element, {
				dragenter: fnHover,
				dragover: fnHover,
				dragleave: fnStop,
				drop: e => {
					fnStop(e);
					if (dragMessages() && ['move','copy'].includes(e.dataTransfer.effectAllowed)) {
						let data = dragData.data;
						if (folder && data?.folder && data.size) {
							moveMessagesToFolder(data.folder, data, folder.fullName, /*data.copy &&*/ e.ctrlKey);
						}
					}
				}
			});
		}
	},

	sortableItem: {
		init: (element, fValueAccessor) => {
			let options = ko.unwrap(fValueAccessor()) || {},
				parent = element.parentNode,
				fnHover = e => {
					if (dragSortable()) {
						e.preventDefault();
						let node = (e.target.closest ? e.target : e.target.parentNode).closest('[draggable]');
						if (node && node !== dragData.data && parent.contains(node)) {
							let rect = node.getBoundingClientRect();
							if (rect.top + (rect.height / 2) <= e.clientY) {
								if (node.nextElementSibling !== dragData.data) {
									node.after(dragData.data);
								}
							} else if (node.previousElementSibling !== dragData.data) {
								node.before(dragData.data);
							}
						}
					}
				};
			addEventsListeners(element, {
				dragstart: e => {
					dragData = {
						action: 'sortable',
						element: element
					};
					setDragAction(e, 'sortable', 'move', element, element);
					element.style.opacity = 0.25;
				},
				dragend: () => {
					element.style.opacity = null;
					if (dragSortable()) {
						dragData.data.style.cssText = '';
						let row = parent.rows[options.list.indexOf(ko.dataFor(element))];
						if (row != dragData.data) {
							row.before(dragData.data);
						}
						dragData = null;
					}
				}
			});
			if (!parent.sortable) {
				parent.sortable = true;
				addEventsListeners(parent, {
					dragenter: fnHover,
					dragover: fnHover,
					drop: e => {
						if (dragSortable()) {
							e.preventDefault();
							let data = ko.dataFor(dragData.data),
								from = options.list.indexOf(data),
								to = [...parent.children].indexOf(dragData.data);
							if (from != to) {
								let arr = options.list();
								arr.splice(to, 0, ...arr.splice(from, 1));
								options.list(arr);
							}
							dragData = null;
							options.afterMove?.();
						}
					}
				});
			}
		}
	},

	initDom: {
		init: (element, fValueAccessor) => fValueAccessor()(element)
	},

	registerBootstrapDropdown: {
		init: element => {
			dropdowns.push(element);
			element.ddBtn = new BSN.Dropdown(element.querySelector('.dropdown-toggle'));
		}
	},

	openDropdownTrigger: {
		update: (element, fValueAccessor) => {
			if (ko.unwrap(fValueAccessor())) {
				const el = element.ddBtn;
				el.open || el.toggle();
	//			el.focus();

				dropdownsDetectVisibility();
				fValueAccessor()(false);
			}
		}
	}
});
