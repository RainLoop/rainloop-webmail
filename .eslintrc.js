module.exports = {
	parser: 'babel-eslint',
//	extends: ['eslint:recommended', 'plugin:prettier/recommended'],
	extends: ['eslint:recommended'],
	plugins: ['prettier'],
	parserOptions: {
		ecmaVersion: 6,
		sourceType: 'module'
	},
	env: {
		node: true,
		browser: true,
		es6: true
	},
	globals: {
		// RainLoop
		'rainloopI18N': "readonly",
		'rainloopTEMPLATES': "readonly",
		'rl': "readonly",
//		'__APP_BOOT': "readonly",
		// deb/boot.js
		'progressJs': "readonly",
		// others
		'jQuery': "readonly",
		'openpgp': "readonly",
		'CKEDITOR': "readonly",
		'Squire': "readonly",
		'SquireUI': "readonly",
		// node_modules/knockout but dev/External/ko.js is used
//		'ko': "readonly",
		// vendors/routes/
		'hasher': "readonly",
		'signals': "readonly",
		'Crossroads': "readonly",
		// vendors/keymaster
		'key': "readonly",
		// vendors/jua
		'Jua': "readonly",
		// vendors/qr.js
		'qr': "readonly",
		// vendors/bootstrap/bootstrap.native.js
		'BSN': "readonly"
	},
	// http://eslint.org/docs/rules/
	rules: {
		// plugins
//		'prettier/prettier': 'error',
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
		]
	}
};
