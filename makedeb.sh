#!/bin/bash
#Build RainLoop Webmail Debian Package
PACKAGEVERSION="0";

#Build rainloop
gulp build;
cd build/dist/releases/webmail;
cd $(ls -t);	#Most recent build folder

#Working directory
mkdir rainloop-deb-build;
cd rainloop-deb-build;

#Prepare zip file
unzip ../rainloop-community-latest.zip;
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;

#Set up package directory
VERSION=$(cat data/VERSION);
DIR="rainloop_$VERSION-$PACKAGEVERSION";
mkdir -m 0755 -p $DIR;
mkdir -m 0755 -p $DIR/usr;
mkdir -m 0755 -p $DIR/usr/share;
mkdir -m 0755 -p $DIR/usr/share/rainloop;
mkdir -m 0755 -p $DIR/var;
mkdir -m 0755 -p $DIR/var/lib;

#Move files into package directory
mv rainloop $DIR/usr/share/rainloop/rainloop;
mv index.php $DIR/usr/share/rainloop/index.php;
mv data $DIR/var/lib/rainloop;

#Update settings for Debian package
sed -i "s/\$sCustomDataPath = '';/\$sCustomDataPath = '\/var\/lib\/rainloop';/" $DIR/usr/share/rainloop/rainloop/v/$VERSION/include.php

#Set up Debian packaging tools
cd $DIR;
mkdir -m 0755 DEBIAN;

#Create Debian packging control file
cat >> DEBIAN/control <<-EOF
	Package: rainloop
	Version: $VERSION
	Section: web
	Priority: optional
	Architecture: all
	Depends: php5-fpm (>= 5.4), php5-curl, php5-json
	Maintainer: Rainloop <support@rainloop.net>
	Installed-Size: 20330
	Description: Rainloop Webmail
	 A modern PHP webmail client.
EOF

#Create Debian packaging post-install script
cat >> DEBIAN/postinst <<-EOF
	#!/bin/sh
	chown -R www-data:www-data /var/lib/rainloop
EOF
chmod +x DEBIAN/postinst;

#Build Debian package
cd ..;
fakeroot dpkg-deb -b $DIR;

#Clean up
mv $DIR.deb ..;
cd ..;
rm -rf rainloop-deb-build;
