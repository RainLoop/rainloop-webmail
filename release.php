#!/usr/bin/php
<?php
chdir(__DIR__);

$gulp = trim(`which gulp`);
if (!$gulp) {
	exit('gulp not installed, run as root: npm install --global gulp-cli');
}

$package = json_decode(file_get_contents('package.json'));

$zip_destination = "snappymail-{$package->version}.zip";
$tar_destination = "snappymail-{$package->version}.tar";

@unlink($zip_destination);
@unlink($tar_destination);
@unlink("{$tar_destination}.gz");

passthru($gulp, $return_var);
if ($return_var) {
	exit("gulp failed with error code {$return_var}\n");
}

$cmddir = escapeshellcmd(__DIR__) . '/snappymail/v/0.0.0/static';

if ($gzip = trim(`which gzip`)) {
	passthru("{$gzip} -k --best {$cmddir}/js/*.js");
	passthru("{$gzip} -k --best {$cmddir}/js/min/*.js");
	passthru("{$gzip} -k --best {$cmddir}/css/app*.css");
	unlink(__DIR__ . '/snappymail/v/0.0.0/static/js/boot.js.gz');
	unlink(__DIR__ . '/snappymail/v/0.0.0/static/js/min/boot.min.js.gz');
}

if ($brotli = trim(`which brotli`)) {
	passthru("{$brotli} -k --best {$cmddir}/js/*.js");
	passthru("{$brotli} -k --best {$cmddir}/js/min/*.js");
	passthru("{$brotli} -k --best {$cmddir}/css/app*.css");
	unlink(__DIR__ . '/snappymail/v/0.0.0/static/js/boot.js.br');
	unlink(__DIR__ . '/snappymail/v/0.0.0/static/js/min/boot.min.js.br');
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

$tar->buildFromDirectory('./snappymail/', "@v/{$package->version}@");

$zip->addFile('data/.htaccess');
$tar->addFile('data/.htaccess');

$zip->addFromString('data/VERSION', $package->version);
$tar->addFromString('data/VERSION', $package->version);

$zip->addFile('data/README.md');
$tar->addFile('data/README.md');

//$zip->addFile('data/EMPTY');
//$tar->addFile('data/EMPTY');

$zip->addFile('_include.php');
$tar->addFile('_include.php');

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

echo "\n{$zip_destination} created\n{$tar_destination}.gz created\n";
