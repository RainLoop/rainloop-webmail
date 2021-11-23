<?php

namespace RainLoop\Providers\Filters;

class Sieve
{
	const NEW_LINE = "\r\n";

	public static function collectionToFileString(array $aFilters) : string
	{
		$sNL = static::NEW_LINE;

		$aCapa = array();
		$aParts = [
			'# This is SnappyMail sieve script.',
			'# Please don\'t change anything here.',
			'# RAINLOOP:SIEVE',
			''
		];

		foreach ($aFilters as /* @var $oItem \RainLoop\Providers\Filters\Classes\Filter */ $oItem)
		{
			$aParts[] = \implode($sNL, [
				'/*',
				'BEGIN:FILTER:'.$oItem->ID(),
				'BEGIN:HEADER',
				\chunk_split(\base64_encode(\json_encode($oItem)), 74, $sNL).'END:HEADER',
				'*/',
				$oItem->Enabled() ? '' : '/* @Filter is disabled ',
				static::filterToSieveScript($oItem, $aCapa),
				$oItem->Enabled() ? '' : '*/',
				'/* END:FILTER */',
				''
			]);
		}

		$aCapa = \array_keys($aCapa);
		$sCapa = \count($aCapa)
			? $sNL . 'require ' . \str_replace('","', '", "', \json_encode($aCapa)).';' . $sNL
			: '';

		return $sCapa . $sNL . \implode($sNL, $aParts);
	}

	public static function fileStringToCollection(string $sFileString) : array
	{
		$aResult = array();
		if (!empty($sFileString) && false !== \strpos($sFileString, 'RAINLOOP:SIEVE'))
		{
			$aMatch = array();
			if (\preg_match_all('/BEGIN:FILTER(.+?)BEGIN:HEADER(.+?)END:HEADER/s', $sFileString, $aMatch) &&
				isset($aMatch[2]) && \is_array($aMatch[2]))
			{
				foreach ($aMatch[2] as $sEncodedLine)
				{
					if (!empty($sEncodedLine))
					{
						$sDecodedLine = \base64_decode(\preg_replace('/\\s+/s', '', $sEncodedLine));
						if (!empty($sDecodedLine))
						{
							$oItem = new Classes\Filter();
							if ($oItem && $oItem->unserializeFromJson($sDecodedLine))
							{
								$aResult[] = $oItem;
							}
						}
					}
				}
			}
		}

		return $aResult;
	}

	private static function conditionToSieveScript(Classes\FilterCondition $oCondition, array &$aCapa) : string
	{
		$sResult = '';
		$sTypeWord = '';
		$bTrue = true;

		$sValue = \trim($oCondition->Value());
		$sValueSecond = \trim($oCondition->ValueSecond());

		if (\strlen($sValue) ||
			(\strlen($sValue) && \strlen($sValueSecond) &&
				Enumerations\ConditionField::HEADER === $oCondition->Field()))
		{
			switch ($oCondition->Type())
			{
				case Enumerations\ConditionType::TEXT:
				case Enumerations\ConditionType::RAW:
				case Enumerations\ConditionType::OVER:
				case Enumerations\ConditionType::UNDER:
					$sTypeWord = ':' . \strtolower($oCondition->Type());
					break;
				case Enumerations\ConditionType::NOT_EQUAL_TO:
					$sResult .= 'not ';
				case Enumerations\ConditionType::EQUAL_TO:
					$sTypeWord = ':is';
					break;
				case Enumerations\ConditionType::NOT_CONTAINS:
					$sResult .= 'not ';
				case Enumerations\ConditionType::CONTAINS:
					$sTypeWord = ':contains';
					break;
				case Enumerations\ConditionType::REGEX:
					$sTypeWord = ':regex';
					$aCapa['regex'] = true;
					break;
				default:
					$bTrue = false;
					$sResult = '/* @Error: unknown type value */ false';
					break;
			}

			switch ($oCondition->Field())
			{
				case Enumerations\ConditionField::FROM:
					$sResult .= 'header '.$sTypeWord.' ["From"]';
					break;
				case Enumerations\ConditionField::RECIPIENT:
					$sResult .= 'header '.$sTypeWord.' ["To", "CC"]';
					break;
				case Enumerations\ConditionField::SUBJECT:
					$sResult .= 'header '.$sTypeWord.' ["Subject"]';
					break;
				case Enumerations\ConditionField::HEADER:
					$sResult .= 'header '.$sTypeWord.' ["'.static::quote($sValueSecond).'"]';
					break;
				case Enumerations\ConditionField::BODY:
					// :text :raw :content
					$sResult .= 'body '.$sTypeWord.' :contains';
					$aCapa['body'] = true;
					break;
				case Enumerations\ConditionField::SIZE:
					$sResult .= 'size '.$sTypeWord;
					break;
				default:
					$bTrue = false;
					$sResult = '/* @Error: unknown field value */ false';
					break;
			}

			if ($bTrue)
			{
				if (\in_array($oCondition->Field(), array(
					Enumerations\ConditionField::FROM,
					Enumerations\ConditionField::RECIPIENT
				)) && false !== \strpos($sValue, ','))
				{
					$aValue = \array_map(function ($sValue) use ($self) {
						return '"'.static::quote(\trim($sValue)).'"';
					}, \explode(',', $sValue));

					$sResult .= ' ['.\trim(\implode(', ', $aValue)).']';
				}
				else if (Enumerations\ConditionField::SIZE === $oCondition->Field())
				{
					$sResult .= ' '.static::quote($sValue);
				}
				else
				{
					$sResult .= ' "'.static::quote($sValue).'"';
				}

				$sResult = \MailSo\Base\Utils::StripSpaces($sResult);
			}
		}
		else
		{
			$sResult = '/* @Error: empty condition value */ false';
		}

		return $sResult;
	}

	private static function filterToSieveScript(Classes\Filter $oFilter, array &$aCapa) : string
	{
		$sNL = static::NEW_LINE;
		$sTab = '    ';

		$bBlock = true;
		$aResult = array();

		// Conditions
		$aConditions = $oFilter->Conditions();
		if (1 < \count($aConditions))
		{
			if (Enumerations\ConditionsType::ANY ===
				$oFilter->ConditionsType())
			{
				$aResult[] = 'if anyof(';

				$bTrim = false;
				foreach ($aConditions as $oCond)
				{
					$bTrim = true;
					$sCons = static::conditionToSieveScript($oCond, $aCapa);
					if (!empty($sCons))
					{
						$aResult[] = $sTab.$sCons.',';
					}
				}
				if ($bTrim)
				{
					$aResult[\count($aResult) - 1] = \rtrim($aResult[\count($aResult) - 1], ',');
				}

				$aResult[] = ')';
			}
			else
			{
				$aResult[] = 'if allof(';
				foreach ($aConditions as $oCond)
				{
					$aResult[] = $sTab . static::conditionToSieveScript($oCond, $aCapa) . ',';
				}

				$aResult[\count($aResult) - 1] = \rtrim($aResult[\count($aResult) - 1], ',');
				$aResult[] = ')';
			}
		}
		else if (1 === \count($aConditions))
		{
			$aResult[] = 'if ' . static::conditionToSieveScript($aConditions[0], $aCapa);
		}
		else
		{
			$bBlock = false;
		}

		// actions
		if ($bBlock)
		{
			$aResult[] = '{';
		}
		else
		{
			$sTab = '';
		}

		if ($oFilter->MarkAsRead() && \in_array($oFilter->ActionType(), array(
			Enumerations\ActionType::NONE,
			Enumerations\ActionType::MOVE_TO,
			Enumerations\ActionType::FORWARD
		)))
		{
			$aCapa['imap4flags'] = true;
			$aResult[] = $sTab.'addflag "\\\\Seen";';
		}

		switch ($oFilter->ActionType())
		{
			case Enumerations\ActionType::NONE:
				if ($oFilter->Stop())
				{
					$aResult[] = $sTab.'stop;';
				}
				break;
			case Enumerations\ActionType::DISCARD:
				$aResult[] = $sTab.'discard;';
				if ($oFilter->Stop())
				{
					$aResult[] = $sTab.'stop;';
				}
				break;
			case Enumerations\ActionType::VACATION:
				$sValue = \trim($oFilter->ActionValue());
				$sValueSecond = \trim($oFilter->ActionValueSecond());
				$sValueThird = \trim($oFilter->ActionValueThird());
				$sValueFourth = \trim($oFilter->ActionValueFourth());
				if (\strlen($sValue))
				{
					$aCapa['vacation'] = true;

					$iDays = 1;
					$sSubject = '';
					if (\strlen($sValueSecond))
					{
						$sSubject = ':subject "'.
							static::quote(\MailSo\Base\Utils::StripSpaces($sValueSecond)).'" ';
					}

					if (\strlen($sValueThird) && \is_numeric($sValueThird) && 1 < (int) $sValueThird)
					{
						$iDays = (int) $sValueThird;
					}

					$sAddresses = '';
					if (\strlen($sValueFourth))
					{
						$aAddresses = \explode(',', $sValueFourth);
						$aAddresses = \array_filter(\array_map(function ($sEmail) use ($self) {
							$sEmail = \trim($sEmail);
							return \strlen($sEmail) ? '"'.static::quote($sEmail).'"' : '';
						}, $aAddresses), 'strlen');

						if (\count($aAddresses))
						{
							$sAddresses = ':addresses ['.\implode(', ', $aAddresses).'] ';
						}
					}

					$aResult[] = $sTab.'vacation :days '.$iDays.' '.$sAddresses.$sSubject.'"'.static::quote($sValue).'";';
					if ($oFilter->Stop())
					{
						$aResult[] = $sTab.'stop;';
					}
				}
				else
				{
					$aResult[] = $sTab.'# @Error (vacation): empty action value';
				}
				break;
			case Enumerations\ActionType::REJECT:
				$sValue = \trim($oFilter->ActionValue());
				if (\strlen($sValue))
				{
					$aCapa['reject'] = true;

					$aResult[] = $sTab.'reject "'.static::quote($sValue).'";';
					if ($oFilter->Stop())
					{
						$aResult[] = $sTab.'stop;';
					}
				}
				else
				{
					$aResult[] = $sTab.'# @Error (reject): empty action value';
				}
				break;
			case Enumerations\ActionType::FORWARD:
				$sValue = $oFilter->ActionValue();
				if (\strlen($sValue))
				{
					if ($oFilter->Keep())
					{
						$aCapa['fileinto'] = true;
						$aResult[] = $sTab.'fileinto "INBOX";';
					}

					$aResult[] = $sTab.'redirect "'.static::quote($sValue).'";';
					if ($oFilter->Stop())
					{
						$aResult[] = $sTab.'stop;';
					}
				}
				else
				{
					$aResult[] = $sTab.'# @Error (redirect): empty action value';
				}
				break;
			case Enumerations\ActionType::MOVE_TO:
				$sFolderName = $oFilter->ActionValue();
				if (\strlen($sFolderName))
				{
					$aCapa['fileinto'] = true;
					$aResult[] = $sTab.'fileinto "'.static::quote($sFolderName).'";';
					if ($oFilter->Stop())
					{
						$aResult[] = $sTab.'stop;';
					}
				}
				else
				{
					$aResult[] = $sTab.'# @Error (fileinto): empty action value';
				}
				break;
		}

		if ($bBlock)
		{
			$aResult[] = '}';
		}

		return \implode($sNL, $aResult);
	}

	private static function quote(string $sValue) : string
	{
		return \str_replace(array('\\', '"'), array('\\\\', '\\"'), \trim($sValue));
	}
}
