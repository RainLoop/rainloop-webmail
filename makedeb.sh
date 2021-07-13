#!/bin/bash
#Build SnappyMail Webmail Debian Package
PACKAGEVERSION="0";

#Build snappymail
gulp build;
cd build/dist/releases/webmail;
cd $(ls -t);	#Most recent build folder

#Working directory
mkdir snappymail-deb-build;
cd snappymail-deb-build;

#Prepare zip file
unzip ../snappymail-community-latest.zip;
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;

#Set up package directory
VERSION=$(cat data/VERSION);
DIR="snappymail_$VERSION-$PACKAGEVERSION";
mkdir -m 0755 -p $DIR;
mkdir -m 0755 -p $DIR/usr;
mkdir -m 0755 -p $DIR/usr/share;
mkdir -m 0755 -p $DIR/usr/share/snappymail;
mkdir -m 0755 -p $DIR/var;
mkdir -m 0755 -p $DIR/var/lib;

#Move files into package directory
mv snappymail $DIR/usr/share/snappymail/snappymail;
mv index.php $DIR/usr/share/snappymail/index.php;
mv data $DIR/var/lib/snappymail;

#Update settings for Debian package
sed -i "s/\$sCustomDataPath = '';/\$sCustomDataPath = '\/var\/lib\/snappymail';/" $DIR/usr/share/snappymail/snappymail/v/$VERSION/include.php

#Set up Debian packaging tools
cd $DIR;
mkdir -m 0755 DEBIAN;

#Create Debian packging control file
cat >> DEBIAN/control <<-EOF
	Package: snappymail
	Version: $VERSION
	Section: web
	Priority: optional
	Architecture: all
	Depends: php7-fpm (>= 7.3), php7-curl, php7-json
	Maintainer: SnappyMail <support@snappymail.net>
	Installed-Size: 20330
	Description: SnappyMail Webmail
	 A modern PHP webmail client.
EOF

#Create Debian packaging post-install script
cat >> DEBIAN/postinst <<-EOF
	#!/bin/sh
	chown -R www-data:www-data /var/lib/snappymail
EOF
chmod +x DEBIAN/postinst;

#Build Debian package
cd ..;
fakeroot dpkg-deb -b $DIR;

#Clean up
mv $DIR.deb ..;
cd ..;
rm -rf snappymail-deb-build;
