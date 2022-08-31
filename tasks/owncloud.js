/* RainLoop Webmail (c) RainLoop Team | Licensed under MIT */
/* eslint-disable consistent-return */

const gulp = require('gulp');
const fs = require('node-fs');

const pkg = require('../package.json');
const { config } = require('./config');
const { copy, zip, del } = require('./common');
const { rainloopBuild } = require('./rainloop');

const owncloudCopy = () => {
	const versionFull = pkg.ownCloudVersion,
		dist = config.releasesPath + '/owncloud/' + versionFull + '/src/';

	fs.mkdirSync(dist, '0777', true);
	fs.mkdirSync(dist + 'rainloop', '0777', true);

	return gulp
		.src('build/owncloud/rainloop-app/**/*', { base: 'build/owncloud/rainloop-app/' })
		.pipe(gulp.dest(dist + 'rainloop'));
};

const owncloudCopyRainLoop = () => {
	const versionFull = pkg.ownCloudVersion,
		dist = config.releasesPath + '/owncloud/' + versionFull + '/src/rainloop/';
	if (config.rainloopBuilded && config.destPath) {
		return gulp.src(config.destPath + '/src/**/*', { base: config.destPath + '/src/' }).pipe(gulp.dest(dist + 'app/'));
	}

	return true;
};

const owncloudCopyRainLoopClean = (done) => {
	if (config.cleanPath) {
		return del(config.cleanPath);
	}
	done();
};

const owncloudSetup = (done) => {
	const versionFull = pkg.ownCloudVersion,
		dist = config.releasesPath + '/owncloud/' + versionFull + '/src/';
	fs.writeFileSync(
		dist + 'rainloop/appinfo/info.xml',
		fs
			.readFileSync(dist + 'rainloop/appinfo/info.xml', 'utf8')
			.replace('<version>0.0</version>', '<version>' + versionFull + '</version>')
			.replace(
				'<licence></licence>',
				'<licence>MIT</licence>'
			)
	);

	fs.writeFileSync(dist + 'rainloop/appinfo/version', versionFull);
	fs.writeFileSync(dist + 'rainloop/VERSION', versionFull);

	config.destPath = config.releasesPath + '/owncloud/' + versionFull + '/';
	config.cleanPath = dist;
	config.zipSrcPath = dist;
	config.zipFile = 'rainloop-owncloud-app-legacy-' + versionFull + '.zip';

	done();
};

const owncloudZip = (done) => {
	if (config.destPath && config.zipSrcPath && config.zipFile) {
		return zip(config.zipSrcPath, config.destPath, config.zipFile);
	}

	done();
};

const owncloudClean = (done) => {
	if (config.cleanPath) {
		return del(config.cleanPath);
	}

	done();
};

exports.owncloud = gulp.series(
	owncloudCopy,
	rainloopBuild,
	owncloudCopyRainLoop,
	owncloudCopyRainLoopClean,
	owncloudSetup,
	owncloudZip,
	owncloudClean
);
