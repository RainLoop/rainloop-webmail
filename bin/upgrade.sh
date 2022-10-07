#!/bin/bash

# UPGRADING Snappymail
#
# I've found this to be working fine when upgrading my Snappymail. The
# commands should be used at your own risk. I take no responsibility.
#
# The script can only be run from the  SnappyMail install directory!
#
# By Uwe Bieling <pychi@gmx.de>
# and Jordan S (https://github.com/jas8522)

if [[ $(id -u) -ne 0 ]] ; then echo -e "\033[1;31mPlease run as root\033[0m" ; exit 1 ; fi

dir=$(pwd)
if [ ! -d "$dir/snappymail/v" ] ; then echo -e "\033[1;31mThis script can only be run from the SnappyMail install directory\033[0m" ; exit 1 ; fi

LATEST_URL="https://snappymail.eu/repository/latest.tar.gz"

OWNERGROUP=`stat -c "%U:%G" snappymail`
OLD_VERSION=`grep "define('APP_VERSION" index.php | awk -F\' '{print $4}'`

# Safty First ... make a backup
DSTAMP=`date +%Y-%m-%d`
echo -e "\033[1;33mBacking up snappymail $OLD_VERSION to ../backup_snappymail_${DSTAMP}.tar.gz\033[0m"
tar -czf ../backup_snappymail_${DSTAMP}.tar.gz .

# Download last release to /tmp
echo -e "\033[1;33mDownloading last release\033[0m"
wget $LATEST_URL -O /tmp/snappymail_latest.tar.gz
NEW_VERSION=`tar -tf /tmp/snappymail_latest.tar.gz | grep "snappymail/v/.*/index.php" | awk -F/ '{print $3}'`

echo -e "\033[1;33mInstalling $NEW_VERSION\033[0m"
tar -xzf /tmp/snappymail_latest.tar.gz

# set permissions
echo -e "\033[1;33mSet permissions\033[0m"
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;
chmod u+x bin/upgrade.sh
chown -R $OWNERGROUP *

echo -e "\033[1;32mFinished with snappymail upgrade from $OLD_VERSION to $NEW_VERSION... \033[0m"
