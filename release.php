#!/usr/bin/php
<?php
chdir(__DIR__);

$options = getopt('', ['aur','docker','plugins']);

if (isset($options['plugins'])) {
	$destPath = "build/dist/releases/plugins/";
	is_dir($destPath) || mkdir($destPath, 0777, true);
	$manifest = [];
	require 'snappymail/v/0.0.0/app/libraries/RainLoop/Plugins/AbstractPlugin.php';
	$keys = [
		'author',
		'category',
		'description',
		'file',
		'id',
		'license',
		'name',
		'release',
		'required',
		'type',
		'url',
		'version'
	];
	foreach (glob('plugins/*', GLOB_NOSORT | GLOB_ONLYDIR) as $dir) {
		if (is_file("{$dir}/index.php")) {
			require "{$dir}/index.php";
			$name = basename($dir);
			$class = new ReflectionClass(str_replace('-', '', $name) . 'Plugin');
			$manifest_item = [];
			foreach ($class->getConstants() as $key => $value) {
				$key = \strtolower($key);
				if (in_array($key, $keys)) {
					$manifest_item[$key] = $value;
				}
			}
			$version = $manifest_item['version'];
			if (0 < floatval($version)) {
				echo "+ {$name} {$version}\n";
				$manifest_item['type'] = 'plugin';
				$manifest_item['id']   = $name;
				$manifest_item['file'] = "{$dir}-{$version}.tgz";
				ksort($manifest_item);
				$manifest[$name] = $manifest_item;
				$tar_destination = "{$destPath}{$name}-{$version}.tar";
				$tgz_destination = "{$destPath}{$name}-{$version}.tgz";
				@unlink($tgz_destination);
				@unlink("{$tar_destination}.gz");
				$tar = new PharData($tar_destination);
				$tar->buildFromDirectory('./plugins/', '/' . \preg_quote("./plugins/{$name}", '/') . '/');
				$tar->compress(Phar::GZ);
				unlink($tar_destination);
				rename("{$tar_destination}.gz", $tgz_destination);
				if (Phar::canWrite()) {
					$phar_destination = "{$destPath}{$name}.phar";
					@unlink($phar_destination);
					$tar = new Phar($phar_destination);
					$tar->buildFromDirectory("./plugins/{$name}/");
					$tar->compress(Phar::GZ);
					unlink($phar_destination);
					rename("{$phar_destination}.gz", $phar_destination);
				}
			} else {
				echo "- {$name} {$version}\n";
			}
		} else {
			echo "- {$name}\n";
		}
	}

	ksort($manifest);
	$manifest = json_encode(array_values($manifest));
	$manifest = str_replace('{"', "\n\t{\n\t\t\"", $manifest);
	$manifest = str_replace('"}', "\"\n\t}", $manifest);
	$manifest = str_replace('}]', "}\n]", $manifest);
	$manifest = str_replace('","', "\",\n\t\t\"", $manifest);
	$manifest = str_replace('\/', '/', $manifest);
	file_put_contents("{$destPath}packages.json", $manifest);
	exit;
}

$gulp = trim(`which gulp`);
if (!$gulp) {
	exit('gulp not installed, run as root: npm install --global gulp-cli');
}

$rollup = trim(`which rollup`);
if (!$rollup) {
	exit('rollup not installed, run as root: npm install --global rollup');
}

// Arch User Repository
// https://aur.archlinux.org/packages/snappymail/
$options['aur'] = isset($options['aur']);

// Docker build
$docker = trim(`which docker`);
$options['docker'] = isset($options['docker']) || (!$options['aur'] && $docker && strtoupper(readline("Build Docker image? (Y/N): ")) === "Y");

$package = json_decode(file_get_contents('package.json'));

$destPath = "build/dist/releases/webmail/{$package->version}/";
is_dir($destPath) || mkdir($destPath, 0777, true);

$zip_destination = "{$destPath}snappymail-{$package->version}.zip";
$tar_destination = "{$destPath}snappymail-{$package->version}.tar";

@unlink($zip_destination);
@unlink($tar_destination);
@unlink("{$tar_destination}.gz");

echo "\x1b[33;1m === Gulp === \x1b[0m\n";
passthru($gulp, $return_var);
if ($return_var) {
	exit("gulp failed with error code {$return_var}\n");
}

/*
passthru("{$rollup} -c", $return_var);
if ($return_var) {
	exit("rollup failed with error code {$return_var}\n");
}
*/

$cmddir = escapeshellcmd(__DIR__) . '/snappymail/v/0.0.0/static';

if ($gzip = trim(`which gzip`)) {
	echo "\x1b[33;1m === Gzip *.js and *.css === \x1b[0m\n";
	passthru("{$gzip} -k --best {$cmddir}/js/*.js");
	passthru("{$gzip} -k --best {$cmddir}/js/min/*.js");
	passthru("{$gzip} -k --best {$cmddir}/css/admin*.css");
	passthru("{$gzip} -k --best {$cmddir}/css/app*.css");
	unlink(__DIR__ . '/snappymail/v/0.0.0/static/js/boot.js.gz');
	unlink(__DIR__ . '/snappymail/v/0.0.0/static/js/min/boot.min.js.gz');
}

if ($brotli = trim(`which brotli`)) {
	echo "\x1b[33;1m === Brotli *.js and *.css === \x1b[0m\n";
	passthru("{$brotli} -k --best {$cmddir}/js/*.js");
	passthru("{$brotli} -k --best {$cmddir}/js/min/*.js");
	passthru("{$brotli} -k --best {$cmddir}/css/admin*.css");
	passthru("{$brotli} -k --best {$cmddir}/css/app*.css");
	unlink(__DIR__ . '/snappymail/v/0.0.0/static/js/boot.js.br');
	unlink(__DIR__ . '/snappymail/v/0.0.0/static/js/min/boot.min.js.br');
}

unlink(__DIR__ . '/snappymail/v/0.0.0/static/js/openpgp.js');
unlink(__DIR__ . '/snappymail/v/0.0.0/static/js/openpgp.js.br');
unlink(__DIR__ . '/snappymail/v/0.0.0/static/js/openpgp.js.gz');

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

$zip->addFile('data/.htaccess');
$tar->addFile('data/.htaccess');

$zip->addFromString('data/VERSION', $package->version);
$tar->addFromString('data/VERSION', $package->version);

$zip->addFile('data/README.md');
$tar->addFile('data/README.md');

//$zip->addFile('data/EMPTY');
//$tar->addFile('data/EMPTY');

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
$index = str_replace('source', 'community', $index);
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

echo "{$zip_destination} created\n{$tar_destination}.gz created\n";

// Arch User Repository
if ($options['aur']) {
/*
	file_put_contents('arch/.SRCINFO', 'pkgbase = snappymail
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
	b2sums = ?
	b2sums = e020b2d4bc694ca056f5c15b148c69553ab610b5e1789f52543aa65e098f8097a41709b5b0fc22a6a01088a9d3f14d623b1b6e9ae2570acd4f380f429301c003
	b2sums = 2536e11622895322cc752c6b651811b2122d3ae60099fe609609d7b45ba1ed00ea729c23f344405078698d161dbf9bcaffabf8eff14b740acdce3c681c513318

pkgname = snappymail
');
*/
}
// Docker build
else if ($options['docker']) {
	echo "\x1b[33;1m === Docker === \x1b[0m\n";
	copy($zip_destination, "./.docker/release/snappymail-{$package->version}.zip");
	if ($docker) {
		passthru("{$docker} build " . __DIR__ . "/.docker/release/ --build-arg FILES_ZIP={$zip_destination} -t snappymail:{$package->version}");
	} else {
		echo "Docker not installed!\n";
	}
}
