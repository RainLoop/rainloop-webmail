<?php
echo "\x1b[33;1m === Nextcloud === \x1b[0m\n";

$nc_destination = "{$destPath}snappymail-{$package->version}-nextcloud.tar";

@unlink($nc_destination);
@unlink("{$nc_destination}.gz");

$nc_tar = new PharData($nc_destination);

$nc_tar->buildFromDirectory('./integrations/nextcloud', "@integrations/nextcloud/snappymail/@");

$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator('snappymail/v'), RecursiveIteratorIterator::SELF_FIRST);
foreach ($files as $file) {
	if (is_file($file)) {
		$file = str_replace('\\', '/', $file);
		$nc_tar->addFile($file, "snappymail/app/{$file}");
	}
}
/*
$nc_tar->addFile('data/.htaccess');
$nc_tar->addFromString('data/VERSION', $package->version);
$nc_tar->addFile('data/README.md');
*/
$nc_tar->addFile('_include.php', 'snappymail/app/_include.php');
$nc_tar->addFile('.htaccess', 'snappymail/app/.htaccess');

$index = file_get_contents('index.php');
$index = str_replace('0.0.0', $package->version, $index);
$nc_tar->addFromString('snappymail/app/index.php', $index);
$nc_tar->addFile('README.md', 'snappymail/app/README.md');

$data = file_get_contents('dev/serviceworker.js');
$nc_tar->addFromString('snappymail/app/serviceworker.js', $data);

$nc_tar->compress(Phar::GZ);
unlink($nc_destination);
$nc_destination .= '.gz';

echo "{$nc_destination} created\n";
