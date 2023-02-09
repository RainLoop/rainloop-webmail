<?php

namespace RainLoop\Providers\AddressBook;

class Utils
{
	private static $aMap = array(
		'title'               => 'FN',
		'name'                => 'FN',
		'fullname'            => 'FN',
		'displayname'         => 'FN',
		'last'                => 0,
		'lastname'            => 0,
		'givenname'           => 1,
		'first'               => 1,
		'firstname'           => 1,
		'middle'              => 2,
		'middlename'          => 2,
		'prefix'              => 3,
		'nameprefix'          => 3,
		'suffix'              => 4,
		'namesuffix'          => 4,
		'shortname'           => 'NICKNAME',
		'nickname'            => 'NICKNAME',
		'birthday'            => 'BDAY',

		'mobile'              => array('TEL', 'CELL'),
		'mobilephone'         => array('TEL', 'CELL'),

		'businessemail'       => array('EMAIL', 'WORK'),
		'businessemail2'      => array('EMAIL', 'WORK'),
		'businessemail3'      => array('EMAIL', 'WORK'),
		'businessphone'       => array('TEL', 'WORK'),
		'businessphone2'      => array('TEL', 'WORK'),
		'businessphone3'      => array('TEL', 'WORK'),
		'businessmobile'      => array('TEL', 'WORK,CELL'),
		'businessmobilephone' => array('TEL', 'WORK,CELL'),
		'businessweb'         => array('URL', 'WORK'),
		'businesswebpage'     => array('URL', 'WORK'),
		'businesswebsite'     => array('URL', 'WORK'),
		'companyphone'        => array('TEL', 'WORK'),
		'companymainphone'    => array('TEL', 'WORK'),

		'primaryphone'        => array('TEL', 'PREF,HOME'),
		'homephone'           => array('TEL', 'HOME'),
		'homephone2'          => array('TEL', 'HOME'),
		'homephone3'          => array('TEL', 'HOME'),
		'email'               => array('EMAIL', 'HOME'),
		'email2'              => array('EMAIL', 'HOME'),
		'email3'              => array('EMAIL', 'HOME'),
		'homeemail'           => array('EMAIL', 'HOME'),
		'homeemail2'          => array('EMAIL', 'HOME'),
		'homeemail3'          => array('EMAIL', 'HOME'),
		'primaryemail'        => array('EMAIL', 'HOME'),
		'primaryemail2'       => array('EMAIL', 'HOME'),
		'primaryemail3'       => array('EMAIL', 'HOME'),
		'emailaddress'        => array('EMAIL', 'HOME'),
		'email2address'       => array('EMAIL', 'HOME'),
		'email3address'       => array('EMAIL', 'HOME'),
		'personalemail'       => array('EMAIL', 'HOME'),
		'personalemail2'      => array('EMAIL', 'HOME'),
		'personalemail3'      => array('EMAIL', 'HOME'),
		'personalwebsite'     => array('URL', 'HOME'),

		'otheremail'          => 'EMAIL',
		'otherphone'          => 'TEL',
		'notes'               => 'NOTE',
		'web'                 => 'URL',
		'webpage'             => 'URL',
		'website'             => 'URL'
/*
	TODO:
		'company'             => '',
		'department'          => '',
		'jobtitle'            => '',
		'officelocation'      => '',
		'homestreet'          => '',
		'homecity'            => '',
		'homestate'           => '',
		'homepostalcode'      => '',
		'homecountry'         => '',
		'businessstreet'      => '',
		'businesscity'        => '',
		'businessstate'       => '',
		'businesspostalcode'  => '',
		'businesscountry'     => '',
*/
	);

	public static function CsvStreamToContacts(/*resource*/ $rFile, string $sDelimiter) : iterable
	{
		\setlocale(LC_CTYPE, 'en_US.UTF-8');

		$aHeaders = \fgetcsv($rFile, 5000, $sDelimiter, '"');
		if (!$aHeaders || 3 >= \count($aHeaders)) {
			return;
		}
		foreach ($aHeaders as $iIndex => $sItemName) {
			$sItemName = \MailSo\Base\Utils::Utf8Clear($sItemName);
			$sItemName = \strtoupper(\trim(\preg_replace('/[\s\-]+/', '', $sItemName)));
			if (!\array_key_exists($sItemName, \Sabre\VObject\Component\VCard::$propertyMap)) {
				$sItemName = \strtolower($sItemName);
				$sItemName = isset(static::$aMap[$sItemName]) ? static::$aMap[$sItemName] : null;
			}
			$aHeaders[$iIndex] = $sItemName;
		}

		while (false !== ($mRow = \fgetcsv($rFile, 5000, $sDelimiter, '"'))) {
			\MailSo\Base\Utils::ResetTimeLimit();
			$iCount = 0;
			$oVCard = new \Sabre\VObject\Component\VCard;
			$aName = ['','','','',''];
			foreach ($mRow as $iIndex => $sItemValue) {
				$sItemName = $aHeaders[$iIndex];
				$sItemValue = \trim($sItemValue);
				if (isset($sItemName) && !empty($sItemValue)) {
					$mType = \is_array($sItemName) ? $sItemName[0] : $sItemName;
					++$iCount;
					if (\is_int($mType)) {
						$aName[$mType] = $sItemValue;
					} else if (\is_array($sItemName)) {
						$oVCard->add($mType, $sItemValue, ['type' => $sItemName[1]]);
					} else if ('FN' === $mType || 'NICKNAME' === $mType) {
						$oVCard->$mType = $sItemValue;
					} else {
						$oVCard->add($mType, $sItemValue);
					}
				}
			}
			if ($iCount) {
				if ('' !== \implode('', $aName)) {
					$oVCard->N = $aName;
				}
				$oContact = new Classes\Contact();
				$oContact->setVCard($oVCard);
				yield $oContact;
			}
		}
	}

	public static function VCardToCsv($stream, Classes\Contact $oContact, bool $bWithHeader = false)/* : int|false*/
	{
		$aData = array();
		if ($bWithHeader) {
			\fputcsv($stream, array(
				'Title', 'First Name', 'Middle Name', 'Last Name', 'Nick Name', 'Display Name',
				'Company', 'Department', 'Job Title', 'Office Location',
				'E-mail Address', 'Notes', 'Web Page', 'Birthday', 'Mobile Phone',
				'Home Email', 'Home Phone',
				'Home Street', 'Home City', 'Home State', 'Home Postal Code', 'Home Country',
				'Business Email', 'Business Phone',
				'Business Street', 'Business City', 'Business State', 'Business Postal Code', 'Business Country'
			));
		}

		$oVCard = $oContact->vCard;

		$aName = isset($oVCard->N) ? $oVCard->N->getParts() : ['','','','',''];

		$adrHome = $oVCard->getByType('ADR', 'HOME');
		$adrHome = $adrHome ? $adrHome->getParts() : ['','','','','','',''];

		$adrWork = $oVCard->getByType('ADR', 'WORK');
		$adrWork = $adrWork ? $adrWork->getParts() : ['','','','','','',''];

		return \fputcsv($stream, array(
			(string) $oVCard->FN,       // Title
			$aName[1],                  // First Name
			$aName[2],                  // Middle Name
			$aName[0],                  // Last Name
			(string) $oVCard->NICKNAME, // Nick Name
			(string) $oVCard->FN,       // Display Name
			(string) $oVCard->ORG,      // Company
			'',                         // Department
			'',                         // Job Title
			'',                         // Office Location
			(string) $oVCard->EMAIL,    // E-mail Address
			(string) $oVCard->NOTE,     // Notes
			(string) $oVCard->URL,      // Web Page
			(string) $oVCard->BDAY,     // Birthday
			(string) $oVCard->getByType('TEL', 'CELL'),   // Mobile Phone
			// Home
			(string) $oVCard->getByType('EMAIL', 'HOME'), // Email
			(string) $oVCard->getByType('TEL', 'HOME'),   // Phone
			\trim($adrHome[1]."\n".$adrHome[2]), // extended address + street address
			$adrHome[3],                // City
			$adrHome[4],                // State
			$adrHome[5],                // Postal Code
			$adrHome[6],                // Country
			// Business
			(string) $oVCard->getByType('EMAIL', 'WORK'), // Email
			(string) $oVCard->getByType('TEL', 'WORK'),   // Phone
			\trim($adrWork[1]."\n".$adrWork[2]), // extended address + street address
			$adrWork[3],                // City
			$adrWork[4],                // State
			$adrWork[5],                // Postal Code
			$adrWork[6]                 // Country
		));
	}

	public static function VcfStreamToContacts(/*resource*/ $rFile) : iterable
	{
		$oVCardSplitter = new \Sabre\VObject\Splitter\VCard($rFile);
		if ($oVCardSplitter) {
			while ($oVCard = $oVCardSplitter->getNext()) {
				if ($oVCard instanceof \Sabre\VObject\Component\VCard) {
					\MailSo\Base\Utils::ResetTimeLimit();
					$oContact = new Classes\Contact();
					$oContact->setVCard($oVCard);
					yield $oContact;
				}
			}
		}
	}
/*
	public static function QrCode(string $sVcfData) : string
	{
		MECARD:N:djmaze;ORG:SnappyMail;TEL:+31012345678;URL:https\://snappymail.eu;EMAIL:info@snappymail.eu;ADR:address line;;
		VCARD
	}
*/
}
