<?php
echo "\x1b[33;1m === cPanel === \x1b[0m\n";

$cpanel_destination = "{$destPath}snappymail-{$package->version}-cpanel.tar";

@unlink($cpanel_destination);
@unlink("{$cpanel_destination}.gz");

$cpanel_tar = new PharData($cpanel_destination);

$cpanel_tar->buildFromDirectory('./integrations/cpanel', "@integrations/cpanel/@");

$cpanel_path = '/usr/local/cpanel/base/3rdparty/snappymail/';

$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator('snappymail/v'), RecursiveIteratorIterator::SELF_FIRST);
foreach ($files as $file) {
	if (is_file($file)) {
		$newFile = str_replace('\\', '/', $file);
		$cpanel_tar->addFile($file, "{$cpanel_path}{$newFile}");
	}
}

$cpanel_tar->addFile('.htaccess', "{$cpanel_path}.htaccess");
$cpanel_tar->addFile('README.md', "{$cpanel_path}README.md");
$cpanel_tar->addFromString("{$cpanel_path}VERSION", $package->version);

$index = file_get_contents('index.php');
$index = str_replace('0.0.0', $package->version, $index);
$cpanel_tar->addFromString("{$cpanel_path}index.php", $index);

$data = file_get_contents('dev/serviceworker.js');
$cpanel_tar->addFromString("{$cpanel_path}serviceworker.js", $data);

$cpanel_tar->compress(Phar::GZ);
unlink($cpanel_destination);
$cpanel_destination .= '.gz';

echo "{$cpanel_destination} created\n";
