/* SnappyMail Webmail (c) SnappyMail | Licensed under AGPL 3 */
/* eslint-disable consistent-return */
const gulp = require('gulp');
const fs = require('node-fs');
const chmod = require('gulp-chmod');

const pkg = require('../package.json');
const { config } = require('./config');
const { copy, zip, del } = require('./common');

const snappymailCopy = () => {
	const versionFull = pkg.version,
		dist = config.releasesPath + '/webmail/' + versionFull + '/src/';
	fs.mkdirSync(dist, '0777', true);
	fs.mkdirSync(dist + 'data');
	fs.mkdirSync(dist + 'snappymail/v/' + versionFull, '0777', true);

	return gulp
		.src('snappymail/v/' + config.devVersion + '/**/*', { base: 'snappymail/v/' + config.devVersion })
		.pipe(chmod(0o644, 0o755))
		.pipe(gulp.dest(dist + 'snappymail/v/' + versionFull));
};

const snappymailSetup = (done) => {
	const versionFull = pkg.version,
		dist = config.releasesPath + '/webmail/' + versionFull + '/src/';
	fs.writeFileSync(dist + 'data/VERSION', versionFull);
	fs.writeFileSync(dist + 'data/EMPTY', versionFull);

	fs.writeFileSync(
		dist + 'index.php',
		fs
			.readFileSync('index.php', 'utf8')
			.replace("'APP_VERSION', '0.0.0'", "'APP_VERSION', '" + versionFull + "'")
	);

	fs.writeFileSync(dist + 'snappymail/v/' + versionFull + '/index.php.root', fs.readFileSync(dist + 'index.php'));

	config.destPath = config.releasesPath + '/webmail/' + versionFull + '/';
	config.cleanPath = dist;
	config.zipSrcPath = dist;
	config.zipFile = 'snappymail-' + versionFull + '.zip';

	config.snappymailBuilded = true;

	done();
};

const snappymailZip = (done) => {
	if (config.destPath && config.zipSrcPath && config.zipFile) {
		return zip(config.zipSrcPath, config.destPath, config.zipFile);
	}

	done();
};

const snappymailClean = (done) => {
	if (config.cleanPath) {
		return del(config.cleanPath);
	}

	done();
};

exports.snappymailBuild = gulp.series(snappymailCopy, snappymailSetup);

exports.snappymail = gulp.series(exports.snappymailBuild, snappymailZip, snappymailClean);
