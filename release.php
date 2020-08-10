<?php
chdir(__DIR__);
$gulp = trim(`which gulp`);
if (!$gulp) {
	exit('gulp not installed, run as root: npm install --global gulp-cli');
}
passthru($gulp, $return_var);
if ($return_var) {
	exit("gulp failed with error code {$return_var}\n");
}

$package = json_decode(file_get_contents('package.json'));

$destination = "rainloop-{$package->version}.zip";

$zip = new ZipArchive();
if (!$zip->open($destination, ZIPARCHIVE::CREATE)) {
	exit("Failed to create {$destination}");
}

$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator('rainloop/v'), RecursiveIteratorIterator::SELF_FIRST);
foreach ($files as $file) {
	$file = str_replace('\\', '/', $file);

	// Ignore "." and ".." folders
	if (in_array(substr($file, strrpos($file, '/')+1), array('.', '..')))
		continue;

	$dest = str_replace('/0.0.0', "/{$package->version}", $file);
	if (is_dir($file)) {
		$zip->addEmptyDir($dest);
	} else if (is_file($file)) {
		$zip->addFromString($dest, file_get_contents($file));
	}
}

$zip->addFromString('data/VERSION', $package->version);
//$zip->addFromString('data/EMPTY', $package->version);
$zip->addFile('_include.php');

$index = file_get_contents('index.php');
$index = str_replace('0.0.0', $package->version, $index);
$index = str_replace('source', 'community', $index);
$zip->addFromString('index.php', $index);

$zip->close();

echo "\n{$destination} created\n";
