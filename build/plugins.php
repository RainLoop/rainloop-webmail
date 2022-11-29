<?php
define('ROOT_DIR', dirname(__DIR__));
define('PLUGINS_DEST_DIR', __DIR__ . '/dist/releases/plugins');

is_dir(PLUGINS_DEST_DIR) || mkdir(PLUGINS_DEST_DIR, 0777, true);
$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator(PLUGINS_DEST_DIR, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::CHILD_FIRST
);
foreach ($files as $fileinfo) {
    $fileinfo->isDir() || unlink($fileinfo->getRealPath());
}

$terser = ROOT_DIR . '/node_modules/terser/bin/terser';

$manifest = [];
require ROOT_DIR . '/snappymail/v/0.0.0/app/libraries/RainLoop/Plugins/AbstractPlugin.php';
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
foreach (glob(ROOT_DIR . '/plugins/*', GLOB_NOSORT | GLOB_ONLYDIR) as $dir) {
	if (is_file("{$dir}/index.php") && !strpos($dir, '.bak')) {
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

			// Minify JavaScript
			foreach (glob("{$dir}/*.js") as $file) {
				if (!strpos($file,'.min')) {
					$mfile = str_replace('.js', '.min.js', $file);
					passthru("{$terser} {$file} --output {$mfile} --compress 'drop_console' --ecma 6 --mangle");
				}
			}
			foreach (glob("{$dir}/js/*.js") as $file) {
				if (!strpos($file,'.min')) {
					$mfile = str_replace('.js', '.min.js', $file);
					passthru("{$terser} {$file} --output {$mfile} --compress 'drop_console' --ecma 6 --mangle");
				}
			}

			$manifest_item['type'] = 'plugin';
			$manifest_item['id']   = $name;
			$manifest_item['file'] = "plugins/{$name}-{$version}.tgz";
			$tar_destination = PLUGINS_DEST_DIR . "/{$name}-{$version}.tar";
			$tgz_destination = PLUGINS_DEST_DIR . "/{$name}-{$version}.tgz";
			@unlink($tgz_destination);
			@unlink("{$tar_destination}.gz");
			$tar = new PharData($tar_destination);
			$tar->buildFromDirectory('./plugins/', '/' . \preg_quote("./plugins/{$name}/", '/') . '((?!\.bak).)*$/');
			$tar->compress(Phar::GZ);
			unlink($tar_destination);
			rename("{$tar_destination}.gz", $tgz_destination);
			if (Phar::canWrite()) {
				$phar_destination = PLUGINS_DEST_DIR . "/{$name}.phar";
				@unlink($phar_destination);
				$tar = new Phar($phar_destination);
				$tar->buildFromDirectory("./plugins/{$name}/", '/^((?!\.bak).)*$/');
				$tar->compress(Phar::GZ);
				unlink($phar_destination);
				rename("{$phar_destination}.gz", $phar_destination);
			}
			if (isset($options['sign'])) {
				passthru('gpg --local-user 1016E47079145542F8BA133548208BA13290F3EB --armor --detach-sign '.escapeshellarg($tgz_destination), $return_var);
				$manifest_item['pgp_sig'] = trim(preg_replace('/-----(BEGIN|END) PGP SIGNATURE-----/', '', file_get_contents($tgz_destination.'.asc')));
			}
			ksort($manifest_item);
			$manifest[$name] = $manifest_item;

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
file_put_contents(dirname(PLUGINS_DEST_DIR) . "/packages.json", $manifest);

exit;
