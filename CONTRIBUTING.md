**Thanks for contributing to SnappyMail Webmail!**

1. Fork the repo, do work in a feature branch.
2. Issue a pull request.

---

**Getting started**

1. Install PHP
2. Install node.js - `https://nodejs.org/download/`
3. Install yarn - `https://yarnpkg.com/en/docs/install`
4. Install gulp - `npm install gulp -g`
5. Fork snappymail from https://github.com/the-djmaze/snappymail
6. Clone snappymail - `git clone git@github.com:USERNAME/snappymail.git snappymail`
7. `cd snappymail`
8. Install all dependencies - `yarn install`
9. Run gulp - `gulp`

---

**Debugging JavaScript**

1. Edit data/\_data_/\_default_/configs/application.ini
2. Set 'use_app_debug_js' (and optionally 'use_app_debug_css') to 'On'

---

**Editing HTML Template Files**

1. Edit data/\_data_/\_default_/configs/application.ini
2. Set `[cache] system_data` to Off

**Release**

1. Install gzip
2. Install brotli
3. php release.php

Options:
* `php release.php --aur` = Build Arch Linux package
* `php release.php --docker` = Build Docker instance
* `php release.php --plugins` = Build plugins

---

If you have any questions, open an issue or email support@snappymail.eu.
