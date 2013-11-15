/* Load this script using conditional IE comments if you need to support IE 7 and IE 6. */

window.onload = function() {
	function addIcon(el, entity) {
		var html = el.innerHTML;
		el.innerHTML = '<span style="font-family: \'icomoon\'">' + entity + '</span>' + html;
	}
	var icons = {
			'icon-paperplane' : '&#xe000;',
			'icon-reply' : '&#xe001;',
			'icon-reply-all' : '&#xe002;',
			'icon-forward' : '&#xe003;',
			'icon-search' : '&#xe004;',
			'icon-add-to-list' : '&#xe005;',
			'icon-info' : '&#xe006;',
			'icon-arrow-right' : '&#xe007;',
			'icon-arrow-down' : '&#xe008;',
			'icon-ellipsis' : '&#xe009;',
			'icon-pencil' : '&#xe00a;',
			'icon-image' : '&#xe00b;',
			'icon-music' : '&#xe00c;',
			'icon-film' : '&#xe00d;',
			'icon-print' : '&#xe00e;',
			'icon-calendar' : '&#xe00f;',
			'icon-key' : '&#xe010;',
			'icon-cog' : '&#xe011;',
			'icon-fire' : '&#xe012;',
			'icon-rocket' : '&#xe013;',
			'icon-checkbox-checked' : '&#xe014;',
			'icon-checkbox-unchecked' : '&#xe015;',
			'icon-checkbox-partial' : '&#xe016;',
			'icon-radio-checked' : '&#xe017;',
			'icon-radio-unchecked' : '&#xe018;',
			'icon-google' : '&#xe019;',
			'icon-google-plus' : '&#xe01a;',
			'icon-facebook' : '&#xe01b;',
			'icon-twitter' : '&#xe01c;',
			'icon-youtube' : '&#xe01d;',
			'icon-file-pdf' : '&#xe01e;',
			'icon-file-word' : '&#xe01f;',
			'icon-file-excel' : '&#xe020;',
			'icon-file-powerpoint' : '&#xe021;',
			'icon-file-xml' : '&#xe022;',
			'icon-file-css' : '&#xe023;',
			'icon-warning' : '&#xe024;',
			'icon-switch' : '&#xe025;',
			'icon-wrench' : '&#xe026;',
			'icon-remove' : '&#xe027;',
			'icon-ok' : '&#xe028;',
			'icon-plus' : '&#xe029;',
			'icon-minus' : '&#xe02a;',
			'icon-attachment' : '&#xe02b;',
			'icon-arrow-left' : '&#xe02c;',
			'icon-arrow-up--upload' : '&#xe02d;',
			'icon-arrow-right-2' : '&#xe02e;',
			'icon-arrow-down-2' : '&#xe02f;',
			'icon-file' : '&#xe030;',
			'icon-file-zip' : '&#xe031;',
			'icon-console' : '&#xe032;',
			'icon-floppy' : '&#xe033;',
			'icon-user' : '&#xe034;',
			'icon-envelope' : '&#xe035;',
			'icon-user-add' : '&#xe036;',
			'icon-eye' : '&#xe037;',
			'icon-arrow-right-3' : '&#xe038;',
			'icon-arrow-down-3' : '&#xe039;',
			'icon-facebook-2' : '&#xe03a;',
			'icon-spinner' : '&#xe03b;',
			'icon-lightning' : '&#xe03c;',
			'icon-trash' : '&#xe03d;',
			'icon-download' : '&#xe03e;',
			'icon-upload' : '&#xe03f;',
			'icon-settings5' : '&#xe040;',
			'icon-bug' : '&#xe041;',
			'icon-libreoffice' : '&#xe042;',
			'icon-file-openoffice' : '&#xe043;',
			'icon-google-drive' : '&#xe044;',
			'icon-edit2' : '&#xe045;',
			'icon-phonebook' : '&#xe046;',
			'icon-book' : '&#xe047;',
			'icon-spinner-2' : '&#xe048;',
			'icon-bell' : '&#xe049;',
			'icon-cart' : '&#xe04a;',
			'icon-cog-2' : '&#xe04b;',
			'icon-legacyfilemanager' : '&#xe04c;',
			'icon-favorite' : '&#xe04d;',
			'icon-favorite2' : '&#xe04e;',
			'icon-loved' : '&#xe04f;',
			'icon-love' : '&#xe050;',
			'icon-scaleup' : '&#xe051;',
			'icon-scaledown' : '&#xe052;',
			'icon-opennewwindow' : '&#xe053;',
			'icon-repeat' : '&#xe054;',
			'icon-reorder' : '&#xe055;',
			'icon-skype' : '&#xe056;',
			'icon-dropbox' : '&#xe057;'
		},
		els = document.getElementsByTagName('*'),
		i, attr, html, c, el;
	for (i = 0; ; i += 1) {
		el = els[i];
		if(!el) {
			break;
		}
		attr = el.getAttribute('data-icon');
		if (attr) {
			addIcon(el, attr);
		}
		c = el.className;
		c = c.match(/icon-[^\s'"]+/);
		if (c && icons[c[0]]) {
			addIcon(el, icons[c[0]]);
		}
	}
};