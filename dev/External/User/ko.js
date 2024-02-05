import 'External/ko';
import ko from 'ko';
import { RFC822 } from 'Common/File';
import { HtmlEditor } from 'Common/Html';
import { timeToNode } from 'Common/Translator';
import { doc, elementById, addEventsListeners, dropdowns, leftPanelDisabled } from 'Common/Globals';
import { EmailAddressesComponent } from 'Component/EmailAddresses';
import { ThemeStore } from 'Stores/Theme';
import { dropFilesInFolder } from 'Common/Folders';
import { setExpandedFolder } from 'Model/FolderCollection';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessagelistUserStore } from 'Stores/User/Messagelist';

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
		id: 0
	},

	dragStop = (e, element) => {
		e.preventDefault();
		element?.classList.remove('droppableHover');
		if (dragTimer.node == element) {
			dragTimer.node = null;
			clearTimeout(dragTimer.id);
		}
	},
	dragEnter = (e, element, folder) => {
		let files = false;
//		if (e.dataTransfer.types.includes('Files'))
		for (const item of e.dataTransfer.items) {
			files |= 'file' === item.kind && RFC822 === item.type;
		}
		if (files || dragMessages()) {
			e.stopPropagation();
			dragStop(e, dragTimer.node);
			e.dataTransfer.dropEffect = files ? 'copy' : (e.ctrlKey ? 'copy' : 'move');
			element.classList.add('droppableHover');
			if (folder.collapsed()) {
				dragTimer.node = element;
				dragTimer.id = setTimeout(() => {
					folder.collapsed(false);
					setExpandedFolder(folder.fullName, true);
				}, 500);
			}
		}
	},
	dragDrop = (e, element, folder, dragData) => {
		dragStop(e, element);
		if (dragMessages() && 'copyMove' == e.dataTransfer.effectAllowed) {
			MessagelistUserStore.moveMessages(
				FolderUserStore.currentFolderFullName(), dragData.data, folder.fullName, e.ctrlKey
			);
		} else if (e.dataTransfer.types.includes('Files')) {
			dropFilesInFolder(folder.fullName, e.dataTransfer.files);
		}
	},

	ttn = (element, fValueAccessor) => timeToNode(element, ko.unwrap(fValueAccessor()));

let dragImage,
	dragData;

Object.assign(ko.bindingHandlers, {

	editor: {
		init: (element, fValueAccessor) => {
			let editor = null;

			const fValue = fValueAccessor(),
				fUpdateEditorValue = () => fValue.__editor?.setHtmlOrPlain(fValue()),
				fUpdateKoValue = () => fValue.__editor && fValue(fValue.__editor.getDataWithHtmlMark()),
				fOnReady = () => {
					fValue.__editor = editor;
					fUpdateEditorValue();
				};

			if (ko.isObservable(fValue)) {
				editor = new HtmlEditor(element, fOnReady, fUpdateKoValue, fUpdateKoValue);

				fValue.__fetchEditorValue = fUpdateKoValue;

				fValue.subscribe(fUpdateEditorValue);

				// ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
				// });
			}
		}
	},

	time: {
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

	// Start dragging checked messages
	dragmessages: {
		init: element => {
			element.addEventListener("dragstart", e => {
				dragImage || (dragImage = elementById('messagesDragImage'));
				if (dragImage && !ThemeStore.isMobile()) {
					ko.dataFor(doc.elementFromPoint(e.clientX, e.clientY))?.checked?.(true);

					const uids = MessagelistUserStore.listCheckedOrSelectedUidsWithSubMails();
					dragImage.querySelector('.text').textContent = uids.size;

					// Make sure Chrome shows it
					dragImage.style.left = e.clientX + 'px';
					dragImage.style.top = e.clientY + 'px';
					dragImage.style.right = 'auto';

					setDragAction(e, 'messages', 'copyMove', uids, dragImage);

					// Remove the Chrome visibility
					dragImage.style.cssText = '';

					leftPanelDisabled(false);
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
			const folder = fValueAccessor(); // ko.dataFor(element)
			folder && addEventsListeners(element, {
				dragenter: e => dragEnter(e, element, folder),
				dragover: e => e.preventDefault(),
				dragleave: e => dragStop(e, element),
				drop: e => dragDrop(e, element, folder, dragData)
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
	}
});
