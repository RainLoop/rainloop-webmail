module.exports = {
	parser: 'babel-eslint',
//	extends: ['eslint:recommended', 'plugin:prettier/recommended'],
	extends: ['eslint:recommended'],
	parserOptions: {
		ecmaVersion: 6,
		sourceType: 'module'
	},
	env: {
		node: true,
		browser: true,
		es2020: true
	},
	globals: {
		// SnappyMail
		'rainloopI18N': "readonly",
		'rainloopTEMPLATES': "readonly",
		'rl': "readonly",
		'shortcuts': "readonly",
//		'__APP_BOOT': "readonly",
		// deb/boot.js
		'progressJs': "readonly",
		// others
		'openpgp': "readonly",
		'CKEDITOR': "readonly",
		'Squire': "readonly",
		'SquireUI': "readonly",
		// node_modules/knockout but dev/External/ko.js is used
		'ko': "readonly",
		// vendors/routes/
		'hasher': "readonly",
		'Crossroads': "readonly",
		// vendors/jua
		'Jua': "readonly",
		// vendors/bootstrap/bootstrap.native.js
		'BSN': "readonly",
		// Mailvelope
		'mailvelope': "readonly"
	},
	// http://eslint.org/docs/rules/
	rules: {
		'no-cond-assign': 0,
		// plugins
		'no-mixed-spaces-and-tabs': 'off',
		'max-len': [
			'error',
			120,
			2,
			{
				ignoreComments: true,
				ignoreUrls: true,
				ignoreTrailingComments: true,
				ignorePattern: '(^\\s*(const|let|var)\\s.+=\\s*require\\s*\\(|^import\\s.+\\sfrom\\s.+;$)'
			}
		],
		'no-constant-condition': ["error", { "checkLoops": false }]
	}
};
