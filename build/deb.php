<?php
echo "\x1b[33;1m === Debian === \x1b[0m\n";

// Debian Repository
define('DEB_SOURCE_DIR', __DIR__ . '/deb');
define('DEB_DEST_DIR', DEB_SOURCE_DIR . "/snappymail_{$package->version}-1_all");
is_dir(DEB_DEST_DIR) && passthru('rm -dfr '.escapeshellarg(DEB_DEST_DIR));

$dir = DEB_DEST_DIR . '/DEBIAN';
$data = file_get_contents(DEB_SOURCE_DIR . '/DEBIAN/control');
$data = str_replace('0.0.0', $package->version, $data);
mkdir($dir, 0755, true);
file_put_contents("{$dir}/control", $data);
copy(DEB_SOURCE_DIR . '/DEBIAN/postinst', $dir . '/postinst');
chmod($dir . '/postinst', 0755);

$dir = DEB_DEST_DIR . '/var/lib/snappymail';
mkdir($dir, 0755, true);
file_put_contents($dir . '/VERSION', $package->version);
copy('data/README.md', "{$dir}/README.md");

$dir = DEB_DEST_DIR . '/usr/share/doc/snappymail';
mkdir($dir, 0755, true);
copy('CODE_OF_CONDUCT.md', "{$dir}/CODE_OF_CONDUCT.md");
copy('CONTRIBUTING.md', "{$dir}/CONTRIBUTING.md");
copy('README.md', "{$dir}/README.md");
//copy('CODE_OF_CONDUCT.md', "{$dir}/CODE_OF_CONDUCT.md");
//usr/share/doc/snappymail/README.Debian
//usr/share/doc/snappymail/changelog.Debian.gz
//usr/share/doc/snappymail/copyright

// Move files into package directory
$dir = DEB_DEST_DIR . '/usr/share/snappymail';
mkdir($dir, 0755, true);
passthru('cp -r "' . dirname(__DIR__) . '/snappymail" "' . $dir . '"');

rename("{$dir}/snappymail/v/0.0.0", "{$dir}/snappymail/v/{$package->version}");

$data = file_get_contents('index.php');
file_put_contents("{$dir}/index.php", str_replace('0.0.0', $package->version, $data));

$data = file_get_contents('_include.php');
file_put_contents("{$dir}/include.php", preg_replace('@(external-snappymail-data-folder/\'\);)@', "\$1\ndefine('APP_DATA_FOLDER_PATH', '/var/lib/snappymail/');", $data));

passthru('dpkg --build ' . escapeshellarg(DEB_DEST_DIR));

$TARGET_DIR = __DIR__ . "/dist/releases/webmail/{$package->version}/";

passthru('mv '
	. escapeshellarg(DEB_DEST_DIR.'.deb') . ' '
	. escapeshellarg($TARGET_DIR . basename(DEB_DEST_DIR.'.deb'))
);

passthru('rm -dfr '.escapeshellarg(DEB_DEST_DIR));

// https://github.com/the-djmaze/snappymail/issues/185#issuecomment-1059420588
$cwd = getcwd();
chdir($TARGET_DIR);
passthru('dpkg-scanpackages . /dev/null > '.escapeshellarg($TARGET_DIR . 'Packages'));
passthru('dpkg-scanpackages . /dev/null | gzip -9c > '.escapeshellarg($TARGET_DIR . 'Packages.gz'));
$size = filesize($TARGET_DIR . 'Packages');
$gz_size = filesize($TARGET_DIR . 'Packages.gz');
$Release = 'Origin: SnappyMail Repository
Label: SnappyMail
Suite: stable
Codename: stable
Version: 1.0
Architectures: all
Components: main
Description: SnappyMail repository
Date: ' . gmdate('r') . '
MD5Sum:
 ' . hash_file('md5', $TARGET_DIR . 'Packages') . ' ' . $size . ' Packages
 ' . hash_file('md5', $TARGET_DIR . 'Packages.gz') . ' ' . $gz_size . ' Packages.gz
SHA1:
 ' . hash_file('sha1', $TARGET_DIR . 'Packages') . ' ' . $size . ' Packages
 ' . hash_file('sha1', $TARGET_DIR . 'Packages.gz') . ' ' . $gz_size . ' Packages.gz
SHA256:
 ' . hash_file('sha256', $TARGET_DIR . 'Packages') . ' ' . $size . ' Packages
 ' . hash_file('sha256', $TARGET_DIR . 'Packages.gz') . ' ' . $gz_size . ' Packages.gz
';
file_put_contents($TARGET_DIR . 'Release', $Release);
chdir($cwd);
