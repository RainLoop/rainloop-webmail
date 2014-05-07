
'use strict';

var
	/**
	 * @type {Object}
	 */
	Consts = {},

	/**
	 * @type {Object}
	 */
	Enums = {},

	/**
	 * @type {Object}
	 */
	NotificationI18N = {},

	/**
	 * @type {Object.<Function>}
	 */
	Utils = {},
	
	/**
	 * @type {Object.<Function>}
	 */
	Plugins = {},

	/**
	 * @type {Object.<Function>}
	 */
	Base64 = {},

	/**
	 * @type {Object}
	 */
	Globals = {},

	/**
	 * @type {Object}
	 */
	ViewModels = {
		'settings': [],
		'settings-removed': [],
		'settings-disabled': []
	},

	/**
	 * @type {Array}
	 */
	BootstrapDropdowns = [],

	/**
	 * @type {*}
	 */
	kn = null,

	/**
	 * @type {Object}
	 */
	AppData = window['rainloopAppData'] || {},

	/**
	 * @type {Object}
	 */
	I18n = window['rainloopI18N'] || {},

	$html = $('html'),
	
//	$body = $('body'),

	$window = $(window),

	$document = $(window.document),

	NotificationClass = window.Notification && window.Notification.requestPermission ? window.Notification : null
;