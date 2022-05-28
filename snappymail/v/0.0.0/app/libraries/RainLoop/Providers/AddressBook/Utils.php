<?php

namespace RainLoop\Providers\AddressBook;

use
	RainLoop\Providers\AddressBook\Enumerations\PropertyType,
	RainLoop\Providers\AddressBook\Classes\Property
;


class Utils
{
	/**
	 * @param mixed $oProp
	 */
	private static function yieldPropertyHelper($oArrayProp, int $iType) : iterable
	{
		$aTmp = [];
		foreach ($oArrayProp as $oProp) {
			$sValue = \trim($oProp->getValue());
			if (\strlen($sValue)) {
				$oTypes = $oProp['TYPE'];
				$aTypes = $oTypes ? $oTypes->getParts() : array();
				$pref = 100;
				if (0 < $oProp['PREF']) {
					$pref = (int) $oProp['PREF'];
				}
				$aTmp[\substr(1000+$pref,-3) . $sValue] = new Property($iType, $sValue, \implode(',', $aTypes));
			}
		}
		\ksort($aTmp);
		foreach ($aTmp as $oProp) {
			yield $oProp;
		}
	}

	/**
	 * @param mixed $oProp
	 */
	private static function getPropertyValueHelper($oProp, bool $bOldVersion) : string
	{
		$sValue = \trim($oProp);
		if ($bOldVersion && !isset($oProp->parameters['CHARSET'])) {
			if (\strlen($sValue)) {
				$sEncValue = \utf8_encode($sValue);
				if (\strlen($sEncValue)) {
					$sValue = $sEncValue;
				}
			}
		}
		return \MailSo\Base\Utils::Utf8Clear($sValue);
	}

	public static function VCardToProperties(\Sabre\VObject\Component\VCard $oVCard) : iterable
	{
		yield new Property(PropertyType::JCARD, \json_encode($oVCard));

		$bOldVersion = !empty($oVCard->VERSION) && \in_array((string) $oVCard->VERSION, array('2.1', '2.0', '1.0'));

		if (isset($oVCard->FN) && '' !== \trim($oVCard->FN)) {
			$sValue = static::getPropertyValueHelper($oVCard->FN, $bOldVersion);
			yield new Property(PropertyType::FULLNAME, $sValue);
		}

		if (isset($oVCard->N)) {
			$aNames = $oVCard->N->getParts();
			foreach ($aNames as $iIndex => $sValue) {
				$sValue = \trim($sValue);
				if ($bOldVersion && !isset($oVCard->N->parameters['CHARSET'])) {
					if (\strlen($sValue)) {
						$sEncValue = \utf8_encode($sValue);
						if (\strlen($sEncValue)) {
							$sValue = $sEncValue;
						}
					}
				}
				$sValue = \MailSo\Base\Utils::Utf8Clear($sValue);
				if ($sValue) {
					switch ($iIndex) {
						case 0:
							yield new Property(PropertyType::LAST_NAME, $sValue);
							break;
						case 1:
							yield new Property(PropertyType::FIRST_NAME, $sValue);
							break;
						case 2:
							yield new Property(PropertyType::MIDDLE_NAME, $sValue);
							break;
						case 3:
							yield new Property(PropertyType::NAME_PREFIX, $sValue);
							break;
						case 4:
							yield new Property(PropertyType::NAME_SUFFIX, $sValue);
							break;
					}
				}
			}
		}

		if (isset($oVCard->EMAIL)) {
			yield from static::yieldPropertyHelper($oVCard->EMAIL, PropertyType::EMAIl);
		}

		if (isset($oVCard->URL)) {
			yield from static::yieldPropertyHelper($oVCard->URL, PropertyType::WEB_PAGE);
		}

		if (isset($oVCard->TEL)) {
			yield from static::yieldPropertyHelper($oVCard->TEL, PropertyType::PHONE);
		}
	}

	private static function csvNameToTypeConvertor(string $sCsvName) : int
	{
		static $aMap = null;
		if (null === $aMap)
		{
			$aMap = array(
				'Title' => PropertyType::FULLNAME,
				'Name' => PropertyType::FULLNAME,
				'FullName' => PropertyType::FULLNAME,
				'DisplayName' => PropertyType::FULLNAME,
				'GivenName' => PropertyType::FIRST_NAME,
				'First' => PropertyType::FIRST_NAME,
				'FirstName' => PropertyType::FIRST_NAME,
				'Middle' => PropertyType::MIDDLE_NAME,
				'MiddleName' => PropertyType::MIDDLE_NAME,
				'Last' => PropertyType::LAST_NAME,
				'LastName' => PropertyType::LAST_NAME,
				'Suffix' => PropertyType::NAME_SUFFIX,
				'NameSuffix' => PropertyType::NAME_SUFFIX,
				'Prefix' => PropertyType::NAME_PREFIX,
				'NamePrefix' => PropertyType::NAME_PREFIX,
				'ShortName' => PropertyType::NICK_NAME,
				'NickName' => PropertyType::NICK_NAME,
				'BusinessFax' => array(PropertyType::PHONE, 'Work,Fax'),
				'BusinessFax2' => array(PropertyType::PHONE, 'Work,Fax'),
				'BusinessFax3' => array(PropertyType::PHONE, 'Work,Fax'),
				'BusinessPhone' => array(PropertyType::PHONE, 'Work'),
				'BusinessPhone2' => array(PropertyType::PHONE, 'Work'),
				'BusinessPhone3' => array(PropertyType::PHONE, 'Work'),
				'CompanyPhone' => array(PropertyType::PHONE, 'Work'),
				'CompanyMainPhone' => array(PropertyType::PHONE, 'Work'),
				'HomeFax' => array(PropertyType::PHONE, 'Home,Fax'),
				'HomeFax2' => array(PropertyType::PHONE, 'Home,Fax'),
				'HomeFax3' => array(PropertyType::PHONE, 'Home,Fax'),
				'HomePhone' => array(PropertyType::PHONE, 'Home'),
				'HomePhone2' => array(PropertyType::PHONE, 'Home'),
				'HomePhone3' => array(PropertyType::PHONE, 'Home'),
				'Mobile' => array(PropertyType::PHONE, 'Mobile'),
				'MobilePhone' => array(PropertyType::PHONE, 'Mobile'),
				'BusinessMobile' => array(PropertyType::PHONE, 'Work,Mobile'),
				'BusinessMobilePhone' => array(PropertyType::PHONE, 'Work,Mobile'),
				'OtherFax' => array(PropertyType::PHONE, 'Other,Fax'),
				'OtherPhone' => array(PropertyType::PHONE, 'Other'),
				'PrimaryPhone' => array(PropertyType::PHONE, 'Pref,Home'),
				'Email' => array(PropertyType::EMAIl, 'Home'),
				'Email2' => array(PropertyType::EMAIl, 'Home'),
				'Email3' => array(PropertyType::EMAIl, 'Home'),
				'HomeEmail' => array(PropertyType::EMAIl, 'Home'),
				'HomeEmail2' => array(PropertyType::EMAIl, 'Home'),
				'HomeEmail3' => array(PropertyType::EMAIl, 'Home'),
				'PrimaryEmail' => array(PropertyType::EMAIl, 'Home'),
				'PrimaryEmail2' => array(PropertyType::EMAIl, 'Home'),
				'PrimaryEmail3' => array(PropertyType::EMAIl, 'Home'),
				'EmailAddress' => array(PropertyType::EMAIl, 'Home'),
				'Email2Address' => array(PropertyType::EMAIl, 'Home'),
				'Email3Address' => array(PropertyType::EMAIl, 'Home'),
				'OtherEmail' => array(PropertyType::EMAIl, 'Other'),
				'BusinessEmail' => array(PropertyType::EMAIl, 'Work'),
				'BusinessEmail2' => array(PropertyType::EMAIl, 'Work'),
				'BusinessEmail3' => array(PropertyType::EMAIl, 'Work'),
				'PersonalEmail' => array(PropertyType::EMAIl, 'Home'),
				'PersonalEmail2' => array(PropertyType::EMAIl, 'Home'),
				'PersonalEmail3' => array(PropertyType::EMAIl, 'Home'),
				'Notes' => PropertyType::NOTE,
				'Web' => PropertyType::WEB_PAGE,
				'BusinessWeb' => array(PropertyType::WEB_PAGE, 'Work'),
				'WebPage' => PropertyType::WEB_PAGE,
				'BusinessWebPage' => array(PropertyType::WEB_PAGE, 'Work'),
				'WebSite' => PropertyType::WEB_PAGE,
				'BusinessWebSite' => array(PropertyType::WEB_PAGE, 'Work'),
				'PersonalWebSite' => PropertyType::WEB_PAGE
			);

			$aMap = \array_change_key_case($aMap, CASE_LOWER);
		}

		$sCsvNameLower = \MailSo\Base\Utils::IsAscii($sCsvName) ? \preg_replace('/[\s\-]+/', '', \strtolower($sCsvName)) : '';
		return !empty($sCsvNameLower) && isset($aMap[$sCsvNameLower]) ? $aMap[$sCsvNameLower] : PropertyType::UNKNOWN;
	}

	/**
	 * TODO: broken
	 */
	public static function CsvArrayToVCards(array $aCsvData) : iterable
	{
		foreach ($aCsvData as $aItem) {
			$oContact = new Classes\Contact();
			\MailSo\Base\Utils::ResetTimeLimit();
			foreach ($aItem as $sItemName => $sItemValue) {
				$sItemName = \trim($sItemName);
				$sItemValue = \trim($sItemValue);
				if (!empty($sItemName) && !empty($sItemValue)) {
					$mData = static::csvNameToTypeConvertor($sItemName);
					$iType = \is_array($mData) ? $mData[0] : $mData;
					if (PropertyType::UNKNOWN !== $iType) {
						$oProp = new Classes\Property();
						$oProp->Type = $iType;
						$oProp->Value = $sItemValue;
						$oProp->TypeStr = \is_array($mData) && !empty($mData[1]) ? $mData[1] : '';
//						$oContact->Properties[] = $oProp;
					}
				}
			}
			if (\count($oContact->Properties)) {
				yield $oContact;
			}
		}
	}

	/**
	 * TODO: broken
	 */
	public static function VCardToCsv(Classes\Contact $oContact, bool $bWithHeader = false) : string
	{
		$aData = array();
		if ($bWithHeader) {
			$aData[] = array(
				'Title', 'First Name', 'Middle Name', 'Last Name', 'Nick Name', 'Display Name',
				'Company', 'Department', 'Job Title', 'Office Location',
				'E-mail Address', 'Notes', 'Web Page', 'Birthday',
				'Other Email', 'Other Phone', 'Other Mobile', 'Mobile Phone',
				'Home Email',		'Home Phone',		'Home Fax',
				'Home Street',		'Home City',		'Home State',		'Home Postal Code',			'Home Country',
				'Business Email',	'Business Phone',	'Business Fax',
				'Business Street',	'Business City',	'Business State',	'Business Postal Code',		'Business Country'
			);
		}

		$oVCard = $oContact->vCard;


		$adrHome = $oVCard->getByType('ADR', 'HOME');
		$adrHome = $adrHome ? $adrHome->getParts() : ['','','','','','',''];

		$adrWork = $oVCard->getByType('ADR', 'WORK');
		$adrWork = $adrWork ? $adrWork->getParts() : ['','','','','','',''];

		$aValues = array(
			'',                         // Title
			'',                         // First Name
			'',                         // Middle Name
			'',                         // Last Name
			(string) $oVCard->NICKNAME, // Nick Name
			(string) $oVCard->FN,       // Display Name
			(string) $oVCard->ORG,      // Company
			'',                         // Department
			'',                         // Job Title
			'',                         // Office Location
			(string) $oVCard->EMAIL,    // E-mail Address
			(string) $oVCard->NOTE,     // Notes
			(string) $oVCard->URL,      // Web Page
			'',                         // Birthday
			'',                         // Other Email
			'',                         // Other Phone
			'',                         // Other Mobile
			(string) $oVCard->getByType('TEL', 'CELL'),   // Mobile Phone
			// Home
			(string) $oVCard->getByType('EMAIL', 'HOME'), // Email
			(string) $oVCard->getByType('TEL', 'HOME'),   // Phone
			'',                         // Fax,
			\trim($adrHome[1]."\n".$adrHome[2]), // extended address + street address
			$adrHome[3],                // City
			$adrHome[4],                // State
			$adrHome[5],                // Postal Code
			$adrHome[6],                // Country
			// Business
			(string) $oVCard->getByType('EMAIL', 'WORK'), // Email
			(string) $oVCard->getByType('TEL', 'WORK'),   // Phone
			'',                         // Fax
			\trim($adrWork[1]."\n".$adrWork[2]), // extended address + street address
			$adrWork[3],                // City
			$adrWork[4],                // State
			$adrWork[5],                // Postal Code
			$adrWork[6]                 // Country
		);

		$aData[] = \array_map(function ($sValue) {
			$sValue = \trim($sValue);
			return \preg_match('/[\r\n,"]/', $sValue) ? '"'.\str_replace('"', '""', $sValue).'"' : $sValue;
		}, $aValues);

		$sResult = '';
		foreach ($aData as $aSubData) {
			$sResult .= \implode(',', $aSubData)."\r\n";
		}

		return $sResult;
	}

	public static function VcfFileToVCards(string $sVcfData) : iterable
	{
		$sVcfData = \trim($sVcfData);
		if ("\xef\xbb\xbf" === \substr($sVcfData, 0, 3)) {
			$sVcfData = \substr($sVcfData, 3);
		}
		$oVCardSplitter = new \Sabre\VObject\Splitter\VCard($sVcfData);
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
}
