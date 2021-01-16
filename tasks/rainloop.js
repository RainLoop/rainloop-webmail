/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
/* eslint-disable consistent-return */
const gulp = require('gulp');
const fs = require('node-fs');
const chmod = require('gulp-chmod');

const pkg = require('../package.json');
const { config } = require('./config');
const { copy, zip, del } = require('./common');

const rainloopCopy = () => {
	const versionFull = pkg.version,
		dist = config.releasesPath + '/webmail/' + versionFull + '/src/';
	fs.mkdirSync(dist, '0777', true);
	fs.mkdirSync(dist + 'data');
	fs.mkdirSync(dist + 'rainloop/v/' + versionFull, '0777', true);

	return gulp
		.src('rainloop/v/' + config.devVersion + '/**/*', { base: 'rainloop/v/' + config.devVersion })
		.pipe(chmod(0o644, 0o755))
		.pipe(gulp.dest(dist + 'rainloop/v/' + versionFull));
};

const rainloopSetup = (done) => {
	const versionFull = pkg.version,
		dist = config.releasesPath + '/webmail/' + versionFull + '/src/';
	fs.writeFileSync(dist + 'data/VERSION', versionFull);
	fs.writeFileSync(dist + 'data/EMPTY', versionFull);

	fs.writeFileSync(
		dist + 'index.php',
		fs
			.readFileSync('index.php', 'utf8')
			.replace("'APP_VERSION', '0.0.0'", "'APP_VERSION', '" + versionFull + "'")
			.replace(
				"'APP_VERSION_TYPE', 'source'",
				"'APP_VERSION_TYPE', '" + (config.community ? 'community' : 'standard') + "'"
			)
	);

	fs.writeFileSync(dist + 'rainloop/v/' + versionFull + '/index.php.root', fs.readFileSync(dist + 'index.php'));

	if (config.community) {
		require('rimraf').sync(dist + 'rainloop/v/' + versionFull + '/app/libraries/RainLoop/Providers/Prem.php');
	}

	config.destPath = config.releasesPath + '/webmail/' + versionFull + '/';
	config.cleanPath = dist;
	config.zipSrcPath = dist;
	config.zipFile = 'rainloop-' + (config.community ? 'community-' : '') + versionFull + '.zip';
	// config.zipFileShort = 'rainloop-' + (config.community ? 'community-' : '') + 'latest.zip';

	config.rainloopBuilded = true;

	done();
};

const rainloopZip = (done) => {
	if (config.destPath && config.zipSrcPath && config.zipFile) {
		return zip(config.zipSrcPath, config.destPath, config.zipFile);
	}

	done();
};

const rainloopClean = (done) => {
	if (config.cleanPath) {
		return del(config.cleanPath);
	}

	done();
};

// const rainloopShortName = (done) => copy(config.destPath + config.zipFile, config.destPath + config.zipFileShort, done);

exports.rainloopBuild = gulp.series(rainloopCopy, rainloopSetup);

exports.rainloop = gulp.series(exports.rainloopBuild, rainloopZip, rainloopClean /*, rainloopShortName*/);
