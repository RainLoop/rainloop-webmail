#!/usr/bin/php
<?php
define('ROOT_DIR', dirname(__DIR__));
chdir(ROOT_DIR);

$options = getopt('', ['aur','docker','plugins','skip-gulp','debian','nextcloud','owncloud','sign']);

if (isset($options['plugins'])) {
	require(ROOT_DIR . '/build/plugins.php');
}

$gulp = trim(`which gulp`);
if (!$gulp) {
	exit('gulp not installed, run as root: npm install --global gulp-cli');
}

$package = json_decode(file_get_contents('package.json'));

/**
 * Update files that contain version
 */
// cloudron
$file = ROOT_DIR . '/integrations/cloudron/Dockerfile';
file_put_contents($file, preg_replace('/VERSION=[0-9.]+/', "VERSION={$package->version}", file_get_contents($file)));
$file = ROOT_DIR . '/integrations/cloudron/DESCRIPTION.md';
file_put_contents($file, preg_replace('/<upstream>[^<]*</', "<upstream>{$package->version}<", file_get_contents($file)));
// docker
$file = ROOT_DIR . '/.docker/release/files/usr/local/include/application.ini';
file_put_contents($file, preg_replace('/current = "[0-9.]+"/', "current = \"{$package->version}\"", file_get_contents($file)));
// virtualmin
$file = ROOT_DIR . '/integrations/virtualmin/snappymail.pl';
file_put_contents($file, preg_replace('/return \\( "[0-9]+\\.[0-9]+\\.[0-9]+" \\)/', "return ( \"{$package->version}\" )", file_get_contents($file)));

// Arch User Repository
// https://aur.archlinux.org/packages/snappymail/
$options['aur'] = isset($options['aur']);

// Docker build
$options['docker'] = isset($options['docker']);
if ($options['docker'] && !($docker = trim(`which docker`))) {
	exit('docker not found');
}
if ($options['docker'] && $options['aur']) {
	exit('Conflict between docker and aur');
}

$destPath = "build/dist/releases/webmail/{$package->version}/";
is_dir($destPath) || mkdir($destPath, 0777, true);

$zip_destination = "{$destPath}snappymail-{$package->version}.zip";
$tar_destination = "{$destPath}snappymail-{$package->version}.tar";

@unlink($zip_destination);
@unlink($tar_destination);
@unlink("{$tar_destination}.gz");

if (!isset($options['skip-gulp'])) {
	echo "\x1b[33;1m === Gulp === \x1b[0m\n";
	passthru($gulp, $return_var);
	if ($return_var) {
		exit("gulp failed with error code {$return_var}\n");
	}

	$cmddir = escapeshellcmd(ROOT_DIR) . '/snappymail/v/0.0.0/static';

	if ($gzip = trim(`which gzip`)) {
		echo "\x1b[33;1m === Gzip *.js and *.css === \x1b[0m\n";
		passthru("{$gzip} -k --best {$cmddir}/js/*.js");
		passthru("{$gzip} -k --best {$cmddir}/js/min/*.js");
		passthru("{$gzip} -k --best {$cmddir}/css/admin*.css");
		passthru("{$gzip} -k --best {$cmddir}/css/app*.css");
		unlink(ROOT_DIR . '/snappymail/v/0.0.0/static/js/boot.js.gz');
		unlink(ROOT_DIR . '/snappymail/v/0.0.0/static/js/min/boot.min.js.gz');
	}

	if ($brotli = trim(`which brotli`)) {
		echo "\x1b[33;1m === Brotli *.js and *.css === \x1b[0m\n";
		passthru("{$brotli} -k --best {$cmddir}/js/*.js");
		passthru("{$brotli} -k --best {$cmddir}/js/min/*.js");
		passthru("{$brotli} -k --best {$cmddir}/css/admin*.css");
		passthru("{$brotli} -k --best {$cmddir}/css/app*.css");
		unlink(ROOT_DIR . '/snappymail/v/0.0.0/static/js/boot.js.br');
		unlink(ROOT_DIR . '/snappymail/v/0.0.0/static/js/min/boot.min.js.br');
	}
}

// Temporary rename folder to speed up PharData
//if (!rename('snappymail/v/0.0.0', "snappymail/v/{$package->version}")){
if (!rename('snappymail/v/0.0.0', "snappymail/v/{$package->version}")) {
	exit('Failed to temporary rename snappymail/v/0.0.0');
}
register_shutdown_function(function(){
	// Rename folder back to original
	@rename("snappymail/v/{$GLOBALS['package']->version}", 'snappymail/v/0.0.0');
});

echo "\x1b[33;1m === Zip/Tar === \x1b[0m\n";

$zip = new ZipArchive();
if (!$zip->open($zip_destination, ZIPARCHIVE::CREATE)) {
	exit("Failed to create {$zip_destination}");
}

$tar = new PharData($tar_destination);

$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator('snappymail/v'), RecursiveIteratorIterator::SELF_FIRST);
foreach ($files as $file) {
	$file = str_replace('\\', '/', $file);
	//echo "{$file}\n";
	// Ignore "." and ".." folders
	if (!in_array(substr($file, strrpos($file, '/')+1), array('.', '..'))) {
		if (is_dir($file)) {
			$zip->addEmptyDir($file);
		} else if (is_file($file)) {
			$zip->addFile($file);
		}
	}
}

if ($options['docker']) {
	$tar->buildFromDirectory('./snappymail/', "@v/{$package->version}@");
} else {
	$tar->buildFromDirectory('./', "@snappymail/v/{$package->version}@");
}

//$zip->addFile('cli/upgrade.sh');
//$tar->addFile('cli/upgrade.sh');

$zip->addFile('data/.htaccess');
$tar->addFile('data/.htaccess');

$zip->addFromString('data/VERSION', $package->version);
$tar->addFromString('data/VERSION', $package->version);

$zip->addFile('data/README.md');
$tar->addFile('data/README.md');

if ($options['aur']) {
	$data = '<?php
function __get_custom_data_full_path()
{
	return \'/var/lib/snappymail\';
}
';
	$zip->addFromString('include.php', $data);
	$tar->addFromString('include.php', $data);
} else {
	$zip->addFile('_include.php');
	$tar->addFile('_include.php');
}

$zip->addFile('.htaccess');
$tar->addFile('.htaccess');

$index = file_get_contents('index.php');
$index = str_replace('0.0.0', $package->version, $index);
$zip->addFromString('index.php', $index);
$tar->addFromString('index.php', $index);

$zip->addFile('README.md');
$tar->addFile('README.md');

$data = file_get_contents('dev/serviceworker.js');
//$data = file_get_contents('snappymail/v/0.0.0/static/js/min/serviceworker.min.js');
$zip->addFromString('serviceworker.js', $data);
$tar->addFromString('serviceworker.js', $data);

$zip->close();

$tar->compress(Phar::GZ);
unlink($tar_destination);
$tar_destination .= '.gz';

echo "{$zip_destination} created\n{$tar_destination} created\n";

if (isset($options['nextcloud'])) {
	require(ROOT_DIR . '/build/nextcloud.php');
}

if (isset($options['owncloud'])) {
	require(ROOT_DIR . '/build/owncloud.php');
}

if (isset($options['cpanel'])) {
	require(ROOT_DIR . '/build/cpanel.php');
}

rename("snappymail/v/{$package->version}", 'snappymail/v/0.0.0');

file_put_contents("{$destPath}core.json", '{
	"version": "'.$package->version.'",
	"file": "../latest.tar.gz",
	"warnings": []
}');

// Arch User Repository
if ($options['aur']) {
	// extension_loaded('blake2')
	if (!function_exists('b2sum') && $b2sum = trim(`which b2sum`)) {
		function b2sum($file) {
			$file = escapeshellarg($file);
			exec("b2sum --binary {$file} 2>&1", $output, $exitcode);
			$output = explode(' ', implode("\n", $output));
			return $output[0];
		}
	}

	$b2sums = function_exists('b2sum') ? [
		b2sum($tar_destination),
		b2sum(ROOT_DIR . '/build/arch/snappymail.sysusers'),
		b2sum(ROOT_DIR . '/build/arch/snappymail.tmpfiles')
	] : [];

	file_put_contents('build/arch/.SRCINFO', 'pkgbase = snappymail
	pkgdesc = modern PHP webmail client
	pkgver = '.$package->version.'
	pkgrel = 1
	url = https://github.com/the-djmaze/snappymail
	arch = any
	license = AGPL3
	makedepends = php
	makedepends = nodejs
	makedepends = yarn
	makedepends = gulp
	depends = php-fpm
	optdepends = mariadb: storage backend for contacts
	optdepends = php-pgsql: storage backend for contacts
	optdepends = php-sqlite: storage backend for contacts
	source = snappymail-'.$package->version.'.tar.gz::https://github.com/the-djmaze/snappymail/archive/v'.$package->version.'.tar.gz
	source = snappymail.sysusers
	source = snappymail.tmpfiles
	b2sums = '.implode("\n	b2sums = ", $b2sums).'

pkgname = snappymail
');

	$file = ROOT_DIR . '/build/arch/PKGBUILD';
	if (is_file($file)) {
		$PKGBUILD = file_get_contents($file);
		$PKGBUILD = preg_replace('/pkgver=[0-9.]+/', "pkgver={$package->version}", $PKGBUILD);
		$PKGBUILD = preg_replace('/b2sums=\\([^)]+\\)/s', "b2sums=('".implode("'\n        '", $b2sums)."')", $PKGBUILD);
		file_put_contents($file, $PKGBUILD);
	}
}
// Debian Repository
else if (isset($options['debian'])) {
	require(ROOT_DIR . '/build/deb.php');
}
// Docker build
else if ($options['docker']) {
	echo "\x1b[33;1m === Docker === \x1b[0m\n";
	$zip_filename = "snappymail-{$package->version}.zip";
	copy($zip_destination, "./.docker/release/{$zip_filename}");
	if ($docker) {
		passthru("{$docker} build --pull " . ROOT_DIR . "/.docker/release/ --build-arg FILES_ZIP={$zip_filename} -t snappymail:{$package->version}");
	} else {
		echo "Docker not installed!\n";
	}
}

if (isset($options['sign'])) {
	echo "\x1b[33;1m === PGP Sign === \x1b[0m\n";
	passthru('gpg --local-user 1016E47079145542F8BA133548208BA13290F3EB --armor --detach-sign '.escapeshellarg($tar_destination), $return_var);
	passthru('gpg --local-user 1016E47079145542F8BA133548208BA13290F3EB --armor --detach-sign '.escapeshellarg($zip_destination), $return_var);
	if (isset($options['nextcloud'])) {
		passthru('gpg --local-user 1016E47079145542F8BA133548208BA13290F3EB --armor --detach-sign '
			.escapeshellarg("{$destPath}snappymail-{$package->version}-nextcloud.tar.gz"), $return_var);
	}
	if (isset($options['owncloud'])) {
		passthru('gpg --local-user 1016E47079145542F8BA133548208BA13290F3EB --armor --detach-sign '
			.escapeshellarg("{$destPath}snappymail-{$package->version}-owncloud.tar.gz"), $return_var);
	}
	if (isset($options['cpanel'])) {
		passthru('gpg --local-user 1016E47079145542F8BA133548208BA13290F3EB --armor --detach-sign '
			.escapeshellarg("{$destPath}snappymail-{$package->version}-cpanel.tar.gz"), $return_var);
	}
	if (isset($options['debian'])) {
		passthru('gpg --local-user 1016E47079145542F8BA133548208BA13290F3EB --armor --detach-sign '
			. escapeshellarg(ROOT_DIR . "/build/dist/releases/webmail/{$package->version}/" . basename(DEB_DEST_DIR.'.deb')), $return_var);
		// https://github.com/the-djmaze/snappymail/issues/185#issuecomment-1059420588
		passthru('gpg --local-user 1016E47079145542F8BA133548208BA13290F3EB --digest-algo SHA512 --clearsign --output '
			. escapeshellarg(ROOT_DIR . "/build/dist/releases/webmail/{$package->version}/InRelease") . ' '
			. escapeshellarg(ROOT_DIR . "/build/dist/releases/webmail/{$package->version}/Release"), $return_var);
		passthru('gpg --local-user 1016E47079145542F8BA133548208BA13290F3EB --digest-algo SHA512 -abs --output '
			. escapeshellarg(ROOT_DIR . "/build/dist/releases/webmail/{$package->version}/Release.gpg") . ' '
			. escapeshellarg(ROOT_DIR . "/build/dist/releases/webmail/{$package->version}/Release"), $return_var);
	}
}
