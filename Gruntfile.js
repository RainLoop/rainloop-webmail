
/*jshint node: true */

'use strict';

module.exports = function (grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		cfg: {
			devVersion: "0.0.0",
			releasesPath: 'build/dist/releases',
			releasesSrcPath: '',
			releaseFolder: 'rainloop',
			releaseZipFile: 'rainloop.zip'
		},
		less: {
			development: {
				files: {
					'rainloop/v/<%= cfg.devVersion %>/static/css/less.css': 'dev/Styles/@Main.less'
				}
			}
		},
		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			files: [
				'Gruntfile.js',
				'rainloop/v/<%= cfg.devVersion %>/static/js/app.js',
				'rainloop/v/<%= cfg.devVersion %>/static/js/admin.js'
			]
		},
		uglify: {
			options: {
				mangle: true,
				compress: true,
				preserveComments: 'some'
			},
			cookie: {
				options: {
					banner: '/*! jquery.cookie v1.4.0 (c) 2013 Klaus Hartl | MIT */\n',
					preserveComments: 'false'
				},
				src: 'vendors/jquery-cookie/jquery.cookie.js',
				dest: 'vendors/jquery-cookie/jquery.cookie-1.4.0.min.js'
			},
			ifvisible: {
				options: {
					banner: '/*!ifvisible.js v1.0.0 (c) 2013 Serkan Yersen | MIT */\n',
					preserveComments: 'false'
				},
				src: 'vendors/ifvisible/src/ifvisible.js',
				dest: 'vendors/ifvisible/ifvisible.min.js'
			},
			wakeup: {
				options: {
					banner: '/*! jQuery WakeUp plugin (c) 2013 Paul Okopny <paul.okopny@gmail.com> | MIT */\n',
					preserveComments: 'false'
				},
				src: 'vendors/jquery-wakeup/jquery.wakeup.js',
				dest: 'vendors/jquery-wakeup/jquery.wakeup.min.js'
			},
			mousewheel: {
				options: {
					banner: '/*! jquery.mousewheel v3.1.4 (c) 2013 Brandon Aaron (http://brandon.aaron.sh) | MIT */\n',
					preserveComments: 'false'
				},
				src: 'vendors/jquery-mousewheel/jquery.mousewheel.js',
				dest: 'vendors/jquery-mousewheel/jquery.mousewheel-3.1.4.min.js'
			},
			nano: {
				options: {
					banner: "/*! nanoScrollerJS v0.7 (c) 2013 James Florentino; modified by RainLoop Team | MIT */\n",
					preserveComments: "false"
				},
				src: 'vendors/jquery-nanoscroller/jquery.nanoscroller.js',
				dest: 'vendors/jquery-nanoscroller/jquery.nanoscroller-0.7.min.js'
			},
			inputosaurus: {
				options: {
					banner: "/*! Inputosaurus Text v0.1.6 (c) 2013 Dan Kielp <dan@sproutsocial.com>; modified by RainLoop Team | MIT */\n",
					preserveComments: "false"
				},
				src: 'vendors/inputosaurus/inputosaurus.js',
				dest: 'vendors/inputosaurus/inputosaurus.min.js'
			},
			pace: {
				src: 'vendors/simple-pace/simple-pace.js',
				dest: 'vendors/simple-pace/simple-pace-1.0.min.js'
			},
			rl: {
				src: 'vendors/rl/rl.js',
				dest: 'vendors/rl/rl-1.0.min.js'
			},
			min_app: {
				src: 'rainloop/v/<%= cfg.devVersion %>/static/js/app.js',
				dest: 'rainloop/v/<%= cfg.devVersion %>/static/js/app.min.js'
			},
			min_admin: {
				src: 'rainloop/v/<%= cfg.devVersion %>/static/js/admin.js',
				dest: 'rainloop/v/<%= cfg.devVersion %>/static/js/admin.min.js'
			}
		},
		concat: {
			js_index: {
				nonull: true,
				src: [
					'vendors/json2.min.js',
					'vendors/simple-pace/simple-pace-1.0.min.js',
					'vendors/rl/rl-1.0.min.js'
				],
				dest: 'rainloop/v/<%= cfg.devVersion %>/static/js/boot.js'
			},
			js_openpgp: {
				nonull: true,
				src: [
					"vendors/openpgp.min.js",
				],
				dest: 'rainloop/v/<%= cfg.devVersion %>/static/js/openpgp.js'
			},
			js_libs: {
				nonull: true,
				options: {
					separator: '\n\n'
				},
				src: [
					"vendors/modernizr.js",
					"vendors/underscore/underscore-1.5.2.min.js",
					"vendors/jquery-1.11.0.min.js",
					"vendors/jquery-ui/js/jquery-ui-1.10.3.custom.min.js",
					"vendors/jquery-cookie/jquery.cookie-1.4.0.min.js",
					"vendors/jquery-finger/jquery.finger.min.js",
					"vendors/jquery-mousewheel/jquery.mousewheel-3.1.4.min.js",
					"vendors/jquery-scrollstop/jquery.scrollstop.min.js",
					"vendors/jquery-lazyload/jquery.lazyload.min.js",
					"vendors/jquery-nanoscroller/jquery.nanoscroller-0.7.min.js",
					"vendors/jquery-wakeup/jquery.wakeup.min.js",
					"vendors/inputosaurus/inputosaurus.min.js",
					"vendors/moment/min/moment.min.js ",
					"vendors/routes/signals.min.js",
					"vendors/routes/hasher.min.js",
					"vendors/routes/crossroads.min.js",
					"vendors/knockout/knockout-3.1.0.js",
					"vendors/knockout-projections/knockout-projections-1.0.0.min.js",
					"vendors/ssm/ssm.min.js",
					"vendors/jua/jua.min.js",
					"vendors/keymaster/keymaster.js",
					"vendors/ifvisible/ifvisible.min.js",
					"vendors/jquery-magnific-popup/jquery.magnific-popup.min.js",
					"vendors/bootstrap/js/bootstrap.min.js",
					"dev/Common/_LibsEnd.js"
				],
				dest: 'rainloop/v/<%= cfg.devVersion %>/static/js/libs.js'
			},
			js_admin: {
				nonull: true,
				options: {
					stripBanners: true,
					banner: '/*! RainLoop Webmail Admin Module (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */\n' +
						'(function (window, $, ko, crossroads, hasher, _) {\n',
					footer: '\n\n}(window, jQuery, ko, crossroads, hasher, _));'
				},
				src: [
					"dev/Common/_Begin.js",
					"dev/Common/_BeginA.js",

					"dev/Common/Globals.js",
					"dev/Common/Constants.js",
					"dev/Common/Enums.js",
					"dev/Common/Utils.js",
					"dev/Common/Base64.js",
					"dev/Common/Knockout.js",
					"dev/Common/LinkBuilder.js",
					"dev/Common/Plugins.js",

					"dev/Storages/LocalStorages/CookieDriver.js",
					"dev/Storages/LocalStorages/LocalStorageDriver.js",
					"dev/Storages/LocalStorage.js",

					"dev/Knoin/AbstractBoot.js",
					"dev/Knoin/AbstractViewModel.js",
					"dev/Knoin/AbstractScreen.js",
					"dev/Knoin/Knoin.js",

					"dev/Models/EmailModel.js",

					"dev/ViewModels/PopupsDomainViewModel.js",
					"dev/ViewModels/PopupsPluginViewModel.js",
					"dev/ViewModels/PopupsActivateViewModel.js",
					"dev/ViewModels/PopupsLanguagesViewModel.js",
					"dev/ViewModels/PopupsAskViewModel.js",

					"dev/ViewModels/AdminLoginViewModel.js",

					"dev/ViewModels/AdminMenuViewModel.js",
					"dev/ViewModels/AdminPaneViewModel.js",

					"dev/Admin/General.js",
					"dev/Admin/Login.js",
					"dev/Admin/Branding.js",
					"dev/Admin/Contacts.js",
					"dev/Admin/Domains.js",
					"dev/Admin/Security.js",
					"dev/Admin/Social.js",
					"dev/Admin/Plugins.js",
					"dev/Admin/Packages.js",
					"dev/Admin/Licensing.js",

					"dev/Storages/AbstractData.js",
					"dev/Storages/AdminData.js",

					"dev/Storages/AbstractAjaxRemote.js",
					"dev/Storages/AdminAjaxRemote.js",

					"dev/Storages/AbstractCache.js",
					"dev/Storages/AdminCache.js",

					"dev/Screens/AbstractSettings.js",

					"dev/Screens/AdminLogin.js",
					"dev/Screens/AdminSettings.js",

					"dev/Boots/AbstractApp.js",
					"dev/Boots/AdminApp.js",

					"dev/Common/_End.js",
					"dev/Common/_CoreEnd.js"
				],
				dest: 'rainloop/v/<%= cfg.devVersion %>/static/js/admin.js'
			},
			js_app: {
				nonull: true,
				options: {
					stripBanners: true,
					banner: '/*! RainLoop Webmail Main Module (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */\n' +
						'(function (window, $, ko, crossroads, hasher, moment, Jua, _, ifvisible, key) {\n',
					footer: '\n\n}(window, jQuery, ko, crossroads, hasher, moment, Jua, _, ifvisible, key));'
				},
				src: [
					"dev/Common/_Begin.js",
					"dev/Common/_BeginW.js",

					"dev/Common/Globals.js",
					"dev/Common/Constants.js",
					"dev/Common/Enums.js",
					"dev/Common/Utils.js",
					"dev/Common/Base64.js",
					"dev/Common/Knockout.js",
					"dev/Common/LinkBuilder.js",
					"dev/Common/Plugins.js",
					"dev/Common/NewHtmlEditorWrapper.js",
					"dev/Common/Selector.js",

					"dev/Storages/LocalStorages/CookieDriver.js",
					"dev/Storages/LocalStorages/LocalStorageDriver.js",
					"dev/Storages/LocalStorages/OpenPgpLocalStorageDriver.js",
					"dev/Storages/LocalStorage.js",

					"dev/Knoin/AbstractBoot.js",
					"dev/Knoin/AbstractViewModel.js",
					"dev/Knoin/AbstractScreen.js",
					"dev/Knoin/Knoin.js",

					"dev/Models/EmailModel.js",
					"dev/Models/ContactModel.js",
					"dev/Models/ContactPropertyModel.js",
					"dev/Models/AttachmentModel.js",
					"dev/Models/ComposeAttachmentModel.js",
					"dev/Models/MessageModel.js",
					"dev/Models/FolderModel.js",
					"dev/Models/AccountModel.js",
					"dev/Models/IdentityModel.js",
					"dev/Models/OpenPgpKeyModel.js",

					"dev/ViewModels/PopupsFolderClearViewModel.js",
					"dev/ViewModels/PopupsFolderCreateViewModel.js",
					"dev/ViewModels/PopupsFolderSystemViewModel.js",
					"dev/ViewModels/PopupsComposeViewModel.js",
					"dev/ViewModels/PopupsContactsViewModel.js",
					"dev/ViewModels/PopupsAdvancedSearchViewModel.js",
					"dev/ViewModels/PopupsAddAccountViewModel.js",
					"dev/ViewModels/PopupsAddOpenPgpKeyViewModel.js",
					"dev/ViewModels/PopupsViewOpenPgpKeyViewModel.js",
					"dev/ViewModels/PopupsGenerateNewOpenPgpKeyViewModel.js",
					"dev/ViewModels/PopupsComposeOpenPgpViewModel.js",
					"dev/ViewModels/PopupsIdentityViewModel.js",
					"dev/ViewModels/PopupsLanguagesViewModel.js",
					"dev/ViewModels/PopupsTwoFactorTestViewModel.js",
					"dev/ViewModels/PopupsAskViewModel.js",
					"dev/ViewModels/PopupsKeyboardShortcutsHelpViewModel.js",

					"dev/ViewModels/LoginViewModel.js",

					"dev/ViewModels/AbstractSystemDropDownViewModel.js",
					"dev/ViewModels/MailBoxSystemDropDownViewModel.js",
					"dev/ViewModels/SettingsSystemDropDownViewModel.js",

					"dev/ViewModels/MailBoxFolderListViewModel.js",
					"dev/ViewModels/MailBoxMessageListViewModel.js",
					"dev/ViewModels/MailBoxMessageViewViewModel.js",

					"dev/ViewModels/SettingsMenuViewModel.js",
					"dev/ViewModels/SettingsPaneViewModel.js",

					"dev/Settings/General.js",
					"dev/Settings/Contacts.js",
					"dev/Settings/Accounts.js",
					"dev/Settings/Identity.js",
					"dev/Settings/Identities.js",
					"dev/Settings/Security.js",
					"dev/Settings/Social.js",
					"dev/Settings/ChangePassword.js",
					"dev/Settings/Folders.js",
					"dev/Settings/Themes.js",
					"dev/Settings/OpenPGP.js",

					"dev/Storages/AbstractData.js",
					"dev/Storages/WebMailData.js",

					"dev/Storages/AbstractAjaxRemote.js",
					"dev/Storages/WebMailAjaxRemote.js",

					"dev/Storages/AbstractCache.js",
					"dev/Storages/WebMailCache.js",

					"dev/Screens/AbstractSettings.js",

					"dev/Screens/Login.js",
					"dev/Screens/MailBox.js",
					"dev/Screens/Settings.js",

					"dev/Boots/AbstractApp.js",
					"dev/Boots/RainLoopApp.js",

					"dev/Common/_End.js",
					"dev/Common/_CoreEnd.js"
				],
				dest: 'rainloop/v/<%= cfg.devVersion %>/static/js/app.js'
			},
			css: {
				nonull: true,
				src: [
					"vendors/jquery-ui/css/smoothness/jquery-ui-1.10.3.custom.css",
					"vendors/normalize/normalize.css",
					"vendors/fontastic/styles.css",
					"vendors/jquery-nanoscroller/nanoscroller.css",
					"vendors/jquery-magnific-popup/magnific-popup.css",
					"vendors/jquery-magnific-popup/magnific-popup-animations.css",
					"vendors/simple-pace/styles.css",
					"vendors/inputosaurus/inputosaurus.css",
					"vendors/flags/flags-fixed.css",
					"rainloop/v/<%= cfg.devVersion %>/static/css/less.css"
				],
				dest: 'rainloop/v/<%= cfg.devVersion %>/static/css/app.css'
			}
		},

		cssmin: {
			css: {
				src: 'rainloop/v/<%= cfg.devVersion %>/static/css/app.css',
				dest: 'rainloop/v/<%= cfg.devVersion %>/static/css/app.min.css'
			}
		},

		compress: {
			build: {
				options: {
					archive: '<%= cfg.releasesPath %>/<%= cfg.releaseFolder %>/<%= cfg.releaseZipFile %>',
					mode: 'zip'
				},
				files: [{
					expand: true,
					cwd: '<%= cfg.releasesPath %>/<%= cfg.releaseFolder %>/src/',
					src: ['**/*']
				}]
			}
		},

		md5: {
			build: {
				files: {
					'<%= cfg.releasesPath %>/<%= cfg.releaseFolder %>/':
						'<%= cfg.releasesPath %>/<%= cfg.releaseFolder %>/<%= cfg.releaseZipFile %>'
				},
				options: {
					keepExtension: true,
					keepBasename: true,
					after: function () {
						grunt.file['delete']([
							grunt.config('cfg.releasesPath'), grunt.config('cfg.releaseFolder'), grunt.config('cfg.releaseZipFile')
						].join("/"));
					}
				}
			}
		},

		watch: {
			js: {
				options: {
					nospawn: true
				},
				files: ['dev/**/*.js', 'vendors/**/*.js'],
				tasks: ['concat:js_libs', 'concat:js_openpgp', 'concat:js_admin', 'concat:js_app']
			},
			styles: {
				options: {
					nospawn: true
				},
				files: ['dev/Styles/*.less'],
				tasks: ['less', 'concat:css']
			}
		}
	});

	// dependencies
	for (var key in grunt.file.readJSON('package.json').devDependencies) {
		if (key.indexOf('grunt-') === 0) {
			grunt.loadNpmTasks(key);
		}
	}

	grunt.registerTask('rainloop', 'RainLoop Webmail build task', function () {

		var
			version = grunt.config('pkg.version'),
			release = grunt.config('pkg.release'),
			releasesPath = grunt.config('cfg.releasesPath'),
			devVersion = grunt.config('cfg.devVersion'),
			versionFull = version + '.' + release,
			dist = releasesPath + '/' + versionFull + '/src/',
			packageJsonContent = grunt.file.read('package.json')
		;

		grunt.file.mkdir(dist);
		grunt.file.mkdir(dist + 'data');
		grunt.file.mkdir(dist + 'rainloop/v/' + versionFull);

		require('wrench').copyDirSyncRecursive('rainloop/v/' + devVersion,
			dist + 'rainloop/v/' + versionFull, {'forceDelete': true});

		grunt.file.copy('index.php', dist + 'index.php');

		grunt.file.write(dist + 'data/VERSION', versionFull);
		grunt.file.write(dist + 'rainloop/v/' + versionFull + '/VERSION', versionFull);
		grunt.file.delete(dist + 'rainloop/v/' + versionFull + '/static/css/less.css');

		grunt.file.write('package.json',
			packageJsonContent.replace(/"release":\s?"[\d]+",/, '"release": "' + (1 + parseInt(release, 10)) + '",'));

		grunt.config.set('cfg.releaseFolder', versionFull);
		grunt.config.set('cfg.releasesSrcPath', dist);
		grunt.config.set('cfg.releaseZipFile', 'rainloop-' + versionFull + '.zip');
	});

	grunt.registerTask('rainloop-clear', 'RainLoop Webmail clear task', function () {
		var releasesSrcPath = grunt.config('cfg.releasesSrcPath');
		if ('' !== releasesSrcPath)
		{
			require('wrench').rmdirSyncRecursive(releasesSrcPath);
		}
	});
	
	// uglify
	grunt.registerTask('rlmin', ['uglify:min_app', 'uglify:min_admin']);
	
	// uglify (optional)
	grunt.registerTask('rl', ['uglify:rl']);
	grunt.registerTask('nano', ['uglify:nano']);
	grunt.registerTask('pace', ['uglify:pace']);
	grunt.registerTask('wakeup', ['uglify:wakeup']);
	grunt.registerTask('cookie', ['uglify:cookie']);
	grunt.registerTask('mousewheel', ['uglify:mousewheel']);
	grunt.registerTask('inputosaurus', ['uglify:inputosaurus']);
	grunt.registerTask('ifvisible', ['uglify:ifvisible']);
	// ---

	grunt.registerTask('default', ['less', 'concat', 'cssmin', 'jshint', 'rlmin']);
	grunt.registerTask('build', ['default', 'rlmin', 'rainloop', 'compress:build', 'md5:build', 'rainloop-clear']);
	grunt.registerTask('fast', ['less', 'concat']);

	// aliases
	grunt.registerTask('u', ['uglify']);
	grunt.registerTask('h', ['jshint']);
	grunt.registerTask('b', ['build']);
	grunt.registerTask('f', ['fast']);
	grunt.registerTask('w', ['default', 'watch']);
};
