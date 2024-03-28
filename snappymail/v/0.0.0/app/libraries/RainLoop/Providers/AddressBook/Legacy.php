<?php

namespace RainLoop\Providers\AddressBook;

use
	RainLoop\Providers\AddressBook\Enumerations\PropertyType,
	RainLoop\Providers\AddressBook\Classes\Property
;

class Legacy
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
				$pref = empty($oProp['PREF']) ? 100 : \min(100, \max(1, $oProp['PREF']->getValue()));
				$pref = \str_pad($pref, 3, '0', \STR_PAD_LEFT);
				$aTmp[$pref . $sValue] = new Property($iType, $sValue, \implode(',', $aTypes));
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
				$sEncValue = \mb_convert_encoding($sValue, 'UTF-8', 'ISO-8859-1');
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
						$sEncValue = \mb_convert_encoding($sValue, 'UTF-8', 'ISO-8859-1');
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
}
