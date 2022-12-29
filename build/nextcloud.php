<?php
echo "\x1b[33;1m === Nextcloud === \x1b[0m\n";

$cert_dir = $_SERVER['HOME'].'/.nextcloud/certificates';

$nc_destination = "{$destPath}snappymail-{$package->version}-nextcloud.tar";

@unlink($nc_destination);
@unlink("{$nc_destination}.gz");

$nc_tar = new PharData($nc_destination);
$hashes = [];

$nc_tar->buildFromDirectory('./integrations/nextcloud', "@integrations/nextcloud/snappymail/@");
$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator('integrations/nextcloud/snappymail'));
foreach ($files as $file) {
	if (is_file($file)) {
		$name = str_replace('\\', '/', $file);
		$name = str_replace('integrations/nextcloud/snappymail/', '', $name);
		$name = str_replace('.htaccess', '_htaccess', $name);
		$hashes[$name] = hash_file('sha512', $file);
	}
}

$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator('snappymail/v'), RecursiveIteratorIterator::SELF_FIRST);
foreach ($files as $file) {
	if (is_file($file)) {
		$newFile = str_replace('\\', '/', $file);
//		$newFile = str_replace("'snappymail/v/'.", '', $newFile);
		$nc_tar->addFile($file, "snappymail/app/{$newFile}");
		$hashes["app/{$newFile}"] = hash_file('sha512', $file);
	}
}
/*
$nc_tar->addFile('data/.htaccess');
$nc_tar->addFromString('data/VERSION', $package->version);
$nc_tar->addFile('data/README.md');
$nc_tar->addFile('_include.php', 'snappymail/app/_include.php');
*/
$nc_tar->addFile('.htaccess', 'snappymail/app/_htaccess');
$hashes['app/.htaccess'] = hash_file('sha512', '.htaccess');

$index = file_get_contents('index.php');
$index = str_replace('0.0.0', $package->version, $index);
//$index = str_replace('snappymail/v/', '', $index);
$nc_tar->addFromString('snappymail/app/index.php', $index);
$hashes['app/index.php'] = hash('sha512', $index);

$nc_tar->addFile('README.md', 'snappymail/app/README.md');
$hashes['app/README.md'] = hash_file('sha512', 'README.md');

$nc_tar->addFile('CHANGELOG.md', 'snappymail/CHANGELOG.md');
$hashes['CHANGELOG.md'] = hash_file('sha512', 'CHANGELOG.md');

$data = file_get_contents('dev/serviceworker.js');
$nc_tar->addFromString('snappymail/app/serviceworker.js', $data);
$hashes['app/serviceworker.js'] = hash('sha512', $data);

spl_autoload_register(function($name){
	$file = __DIR__ . '/' . str_replace('\\', '/', $name) . '.php';
	echo "{$file}\n";
	require $file;
});

ksort($hashes);
$cert = file_get_contents($cert_dir.'/snappymail.crt');
$rsa = new \phpseclib\Crypt\RSA();
$rsa->loadKey(file_get_contents($cert_dir.'/snappymail.key'));
$x509 = new \phpseclib\File\X509();
$x509->loadX509($cert);
$x509->setPrivateKey($rsa);
$rsa->setSignatureMode(\phpseclib\Crypt\RSA::SIGNATURE_PSS);
$rsa->setMGFHash('sha512');
$rsa->setSaltLength(0);
$signature = $rsa->sign(json_encode($hashes));
$nc_tar->addFromString('snappymail/appinfo/signature.json', json_encode([
	'hashes' => $hashes,
	'signature' => base64_encode($signature),
	'certificate' => $cert
], JSON_PRETTY_PRINT));

$nc_tar->compress(Phar::GZ);
unlink($nc_destination);
$nc_destination .= '.gz';

$signature = shell_exec("openssl dgst -sha512 -sign {$cert_dir}/snappymail.key {$nc_destination} | openssl base64");
file_put_contents($nc_destination.'.sig', $signature);

echo "{$nc_destination} created\n";
