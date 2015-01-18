<?php

namespace RainLoop\Providers\Filters;

class SieveStorage implements \RainLoop\Providers\Filters\FiltersInterface
{
	const NEW_LINE = "\n";

	/**
	 * @var bool
	 */
	private $bUtf8FolderName;

	/**
	 * @param bool $bUtf8FolderName = true
	 *
	 * @return void
	 */
	public function __construct($bUtf8FolderName = true)
	{
		$this->bUtf8FolderName = !!$bUtf8FolderName;
	}

	/**
	 * @return array
	 */
	public function Load()
	{
		return $this->fileStringToCollection(@\file_get_contents('e:/sieve.txt'));
	}

	/**
	 * @param array $aFilters
	 *
	 * @return bool
	 */
	public function Save($aFilters)
	{
		return @\file_put_contents('e:/sieve.txt', $this->collectionToFileString($aFilters));
	}

	/**
	 * @param \RainLoop\Providers\Filters\Classes\FilterCondition $oCondition
	 *
	 * @return string
	 */
	private function conditionToSieveScript($oCondition)
	{
		$sResult = '';
		$sTypeWord = '';

		$sValue = \trim($oCondition->Value());
		if (0 < strlen($sValue))
		{
			switch ($oCondition->Type())
			{
				case \RainLoop\Providers\Filters\Enumerations\ConditionType::NOT_EQUAL_TO:
					$sResult .= 'not ';
				case \RainLoop\Providers\Filters\Enumerations\ConditionType::EQUAL_TO:
					$sTypeWord = ':is';
					break;
				case \RainLoop\Providers\Filters\Enumerations\ConditionType::NOT_CONTAINS:
					$sResult .= 'not ';
				case \RainLoop\Providers\Filters\Enumerations\ConditionType::CONTAINS:
					$sTypeWord = ':contains';
					break;
			}

			switch ($oCondition->Field())
			{
				case \RainLoop\Providers\Filters\Enumerations\ConditionField::FROM:
					$sResult .= 'header '.$sTypeWord.' ["From"]';
					break;
				case \RainLoop\Providers\Filters\Enumerations\ConditionField::RECIPIENT:
					$sResult .= 'header '.$sTypeWord.' ["To", "CC"]';
					break;
				case \RainLoop\Providers\Filters\Enumerations\ConditionField::SUBJECT:
					$sResult .= 'header '.$sTypeWord.' ["Subject"]';
					break;
			}

			if (\in_array($oCondition->Field(), array(
				\RainLoop\Providers\Filters\Enumerations\ConditionField::FROM,
				\RainLoop\Providers\Filters\Enumerations\ConditionField::RECIPIENT
			)) && false !== \strpos($sValue, ','))
			{
				$self = $this;
				$aValue = \array_map(function ($sValue) use ($self) {
					return '"'.$self->quote(\trim($sValue)).'"';
				}, \explode(',', $sValue));

				$sResult .= ' ['.\trim(\implode(', ', $aValue)).']';
			}
			else
			{
				$sResult .= ' "'.$this->quote($sValue).'"';
			}

			$sResult = \preg_replace('/[\s]+/u', ' ', $sResult);
		}
		else
		{
			$sResult = '/* @Error: empty condition value */ false';
		}

		return $sResult;
	}

	/**
	 * @param \RainLoop\Providers\Filters\Classes\Filter $oFilter
	 * @param array $aCapa
	 *
	 * @return string
	 */
	private function filterToSieveScript($oFilter, &$aCapa)
	{
		$sNL = \RainLoop\Providers\Filters\SieveStorage::NEW_LINE;
		$sTab = '    ';

		$bAll = false;
		$aResult = array();

		// Conditions
		$aConditions = $oFilter->Conditions();
		if (\is_array($aConditions))
		{
			if (1 < \count($aConditions))
			{
				if (\RainLoop\Providers\Filters\Enumerations\ConditionsType::ANY ===
					$oFilter->ConditionsType())
				{
					$aResult[] = 'if anyof(';

					$bTrim = false;
					foreach ($aConditions as $oCond)
					{
						$bTrim = true;
						$sCons = $this->conditionToSieveScript($oCond);
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
						$aResult[] = $sTab.$this->conditionToSieveScript($oCond).',';
					}

					$aResult[\count($aResult) - 1] = \rtrim($aResult[\count($aResult) - 1], ',');
					$aResult[] = ')';
				}
			}
			else if (1 === \count($aConditions))
			{
				$aResult[] = 'if '.$this->conditionToSieveScript($aConditions[0]).'';
			}
			else
			{
				$bAll = true;
			}
		}

		// actions
		if (!$bAll)
		{
			$aResult[] = '{';
		}
		else
		{
			$sTab = '';
		}

		if ($oFilter->MarkAsRead())
		{
			$aCapa['imap4flags'] = true;
			$aResult[] = $sTab.'addflag "\\\\Seen";';
		}

		switch ($oFilter->ActionType())
		{
			case \RainLoop\Providers\Filters\Enumerations\ActionType::NONE:
				$aResult[] = $sTab.'stop;';
				break;
			case \RainLoop\Providers\Filters\Enumerations\ActionType::DISCARD:
				$aResult[] = $sTab.'discard;';
				$aResult[] = $sTab.'stop;';
				break;
			case \RainLoop\Providers\Filters\Enumerations\ActionType::FORWARD:
				$sValue = $oFilter->ActionValue();
				if (0 < \strlen($sValue))
				{
					if ($oFilter->KeepForward())
					{
						$aCapa['copy'] = true;
						$aResult[] = $sTab.'redirect :copy "'.$this->quote($sValue).'";';
					}
					else
					{
						$aResult[] = $sTab.'redirect "'.$this->quote($sValue).'";';
					}

					$aResult[] = $sTab.'stop;';
				}
				else
				{
					$aResult[] = $sTab.'# @Error (redirect): empty action value';
				}
				break;
			case \RainLoop\Providers\Filters\Enumerations\ActionType::MOVE_TO:
				$sValue = $oFilter->ActionValue();
				if (0 < \strlen($sValue))
				{
					$aCapa['fileinto'] = true;

					$sFolderName = $sValue; // utf7-imap
					if ($this->bUtf8FolderName) // to utf-8
					{
						$sFolderName = \MailSo\Base\Utils::ConvertEncoding($sFolderName,
							\MailSo\Base\Enumerations\Charset::UTF_7_IMAP,
							\MailSo\Base\Enumerations\Charset::UTF_8);
					}

					$aResult[] = $sTab.'fileinto "'.$this->quote($sFolderName).'";';
					$aResult[] = $sTab.'stop;';
				}
				else
				{
					$aResult[] = $sTab.'# @Error (fileinto): empty action value';
				}
				break;
		}

		if (!$bAll)
		{
			$aResult[] = '}';
		}

		return \implode($sNL, $aResult);
	}

	/**
	 * @param array $aFilters
	 *
	 * @return string
	 */
	private function collectionToFileString($aFilters)
	{
		$sNL = \RainLoop\Providers\Filters\SieveStorage::NEW_LINE;

		$aCapa = array();
		$aParts = array();

		$aParts[] = '# This is RainLoop Webmail sieve script.';
		$aParts[] = '# Please don\'t change anything here.';
		$aParts[] = '# RAINLOOP:SIEVE';
		$aParts[] = '';

		foreach ($aFilters as /* @var $oItem \RainLoop\Providers\Filters\Classes\Filter */ $oItem)
		{
			$aData = array();
			$aData[] = '/*';
			$aData[] = 'BEGIN:FILTER:'.$oItem->ID();
			$aData[] = 'BEGIN:HEADER';
			$aData[] = \chunk_split(\base64_encode($oItem->serializeToJson()), 74, $sNL).'END:HEADER';
			$aData[] = '*/';
			$aData[] = $oItem->Enabled() ? '' : '/* @Filter is disabled ';
			$aData[] = $this->filterToSieveScript($oItem, $aCapa);
			$aData[] = $oItem->Enabled() ? '' : '*/';
			$aData[] = '/* END:FILTER */';
			$aData[] = '';

			$aParts[] = \implode($sNL, $aData);
		}

		$aCapa = \array_keys($aCapa);
		$sCapa = 0 < \count($aCapa) ? $sNL.'require '.
			\str_replace('","', '", "', \json_encode($aCapa)).';'.$sNL : '';

		return $sCapa.$sNL.\implode($sNL, $aParts).$sNL;
	}

	/**
	 * @param string $sFileString
	 *
	 * @return array
	 */
	private function fileStringToCollection($sFileString)
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
						$sDecodedLine = \base64_decode(\preg_replace('/[\s]+/', '', $sEncodedLine));
						if (!empty($sDecodedLine))
						{
							$oItem = new \RainLoop\Providers\Filters\Classes\Filter();
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

	/**
	 * @param string $sValue
	 *
	 * @return string
	 */
	private function quote($sValue)
	{
		return \str_replace('"', '\\"', \trim($sValue));
	}
}
