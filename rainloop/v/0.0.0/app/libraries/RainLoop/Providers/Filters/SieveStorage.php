<?php

namespace RainLoop\Providers\Filters;

class SieveStorage implements \RainLoop\Providers\Filters\FiltersInterface
{
	const NEW_LINE = "\r\n";

	const SIEVE_FILE_NAME = 'rainloop.user';
	const SIEVE_FILE_NAME_RAW = 'rainloop.user.raw';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger;

	/**
	 * @var \RainLoop\Plugins\Manager
	 */
	private $oPlugins;

	/**
	 * @var \RainLoop\Application
	 */
	private $oConfig;

	/**
	 * @var bool
	 */
	private $bUtf8FolderName;

	/**
	 * @return void
	 */
	public function __construct($oPlugins, $oConfig)
	{
		$this->oLogger = null;

		$this->oPlugins = $oPlugins;
		$this->oConfig = $oConfig;

		$this->bUtf8FolderName = !!$this->oConfig->Get('labs', 'sieve_utf8_folder_name', true);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param bool $bAllowRaw = false
	 *
	 * @return array
	 */
	public function Load($oAccount, $bAllowRaw = false)
	{
		$sRaw = '';

		$bBasicIsActive = false;
		$bRawIsActive = false;

		$aModules = array();
		$aFilters = array();

		$oSieveClient = \MailSo\Sieve\ManageSieveClient::NewInstance()->SetLogger($this->oLogger);
		$oSieveClient->SetTimeOuts(10, (int) $this->oConfig->Get('labs', 'sieve_timeout', 10));

		if ($oAccount->SieveConnectAndLoginHelper($this->oPlugins, $oSieveClient, $this->oConfig))
		{
			$aModules = $oSieveClient->Modules();
			$aList = $oSieveClient->ListScripts();

			if (\is_array($aList) && 0 < \count($aList))
			{
				if (isset($aList[self::SIEVE_FILE_NAME]))
				{
					$bBasicIsActive = !!$aList[self::SIEVE_FILE_NAME];
					$sS = $oSieveClient->GetScript(self::SIEVE_FILE_NAME);
					if ($sS)
					{
						$aFilters = $this->fileStringToCollection($sS);
					}
				}

				if ($bAllowRaw && isset($aList[self::SIEVE_FILE_NAME_RAW]))
				{
					$bRawIsActive = !!$aList[self::SIEVE_FILE_NAME_RAW];
					$sRaw = \trim($oSieveClient->GetScript(self::SIEVE_FILE_NAME_RAW));
				}
			}

			$oSieveClient->LogoutAndDisconnect();
		}

		return array(
			'RawIsAllow' => $bAllowRaw,
			'RawIsActive' => $bRawIsActive,
			'Raw' => $bAllowRaw ? $sRaw : '',
			'Filters' => !$bBasicIsActive && !$bRawIsActive ? array() : $aFilters,
			'Capa' => $bAllowRaw ? $aModules : array(),
			'Modules' => array(
				'redirect' => \in_array('fileinto', $aModules),
				'regex' => \in_array('regex', $aModules),
				'relational' => \in_array('relational', $aModules),
				'date' => \in_array('date', $aModules),
				'moveto' => \in_array('fileinto', $aModules),
				'reject' => \in_array('reject', $aModules),
				'vacation' => \in_array('vacation', $aModules),
				'markasread' => \in_array('imap4flags', $aModules)
			)
		);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param array $aFilters
	 * @param string $sRaw = ''
	 * @param bool $bRawIsActive = false
	 *
	 * @return bool
	 */
	public function Save($oAccount, $aFilters, $sRaw = '', $bRawIsActive = false)
	{
		$oSieveClient = \MailSo\Sieve\ManageSieveClient::NewInstance()->SetLogger($this->oLogger);
		$oSieveClient->SetTimeOuts(10, (int) \RainLoop\Api::Config()->Get('labs', 'sieve_timeout', 10));

		if ($oAccount->SieveConnectAndLoginHelper($this->oPlugins, $oSieveClient, $this->oConfig))
		{
			$aList = $oSieveClient->ListScripts();

			if ($bRawIsActive)
			{
				if (!empty($sRaw))
				{
					$oSieveClient->PutScript(self::SIEVE_FILE_NAME_RAW, $sRaw);
					$oSieveClient->SetActiveScript(self::SIEVE_FILE_NAME_RAW);
				}
				else if (isset($aList[self::SIEVE_FILE_NAME_RAW]))
				{
					$oSieveClient->DeleteScript(self::SIEVE_FILE_NAME_RAW);
				}
			}
			else
			{
				$sUserFilter = $this->collectionToFileString($aFilters);

				if (!empty($sUserFilter))
				{
					$oSieveClient->PutScript(self::SIEVE_FILE_NAME, $sUserFilter);
					$oSieveClient->SetActiveScript(self::SIEVE_FILE_NAME);
				}
				else if (isset($aList[self::SIEVE_FILE_NAME]))
				{
					$oSieveClient->DeleteScript(self::SIEVE_FILE_NAME);
				}
			}

			$oSieveClient->LogoutAndDisconnect();

			return true;
		}

		return false;
	}

	/**
	 * @param \RainLoop\Providers\Filters\Classes\FilterCondition $oCondition
	 *
	 * @return string
	 */
	private function conditionToSieveScript($oCondition, &$aCapa)
	{
		$sResult = '';
		$sTypeWord = '';
		$bTrue = true;

		$sValue = \trim($oCondition->Value());
		$sValueSecond = \trim($oCondition->ValueSecond());

		if (0 < \strlen($sValue) ||
			(0 < \strlen($sValue) && 0 < \strlen($sValueSecond) &&
				\RainLoop\Providers\Filters\Enumerations\ConditionField::HEADER === $oCondition->Field()))
		{
			switch ($oCondition->Type())
			{
				case \RainLoop\Providers\Filters\Enumerations\ConditionType::OVER:
					$sTypeWord = ':over';
					break;
				case \RainLoop\Providers\Filters\Enumerations\ConditionType::UNDER:
					$sTypeWord = ':under';
					break;
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
				case \RainLoop\Providers\Filters\Enumerations\ConditionType::REGEX:
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
				case \RainLoop\Providers\Filters\Enumerations\ConditionField::FROM:
					$sResult .= 'header '.$sTypeWord.' ["From"]';
					break;
				case \RainLoop\Providers\Filters\Enumerations\ConditionField::RECIPIENT:
					$sResult .= 'header '.$sTypeWord.' ["To", "CC"]';
					break;
				case \RainLoop\Providers\Filters\Enumerations\ConditionField::SUBJECT:
					$sResult .= 'header '.$sTypeWord.' ["Subject"]';
					break;
				case \RainLoop\Providers\Filters\Enumerations\ConditionField::HEADER:
					$sResult .= 'header '.$sTypeWord.' ["'.$this->quote($sValueSecond).'"]';
					break;
				case \RainLoop\Providers\Filters\Enumerations\ConditionField::SIZE:
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
				else if (\RainLoop\Providers\Filters\Enumerations\ConditionField::SIZE === $oCondition->Field())
				{
					$sResult .= ' '.$this->quote($sValue);
				}
				else
				{
					$sResult .= ' "'.$this->quote($sValue).'"';
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
						$sCons = $this->conditionToSieveScript($oCond, $aCapa);
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
						$aResult[] = $sTab.$this->conditionToSieveScript($oCond, $aCapa).',';
					}

					$aResult[\count($aResult) - 1] = \rtrim($aResult[\count($aResult) - 1], ',');
					$aResult[] = ')';
				}
			}
			else if (1 === \count($aConditions))
			{
				$aResult[] = 'if '.$this->conditionToSieveScript($aConditions[0], $aCapa).'';
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

		if ($oFilter->MarkAsRead() && \in_array($oFilter->ActionType(), array(
			\RainLoop\Providers\Filters\Enumerations\ActionType::NONE,
			\RainLoop\Providers\Filters\Enumerations\ActionType::MOVE_TO,
			\RainLoop\Providers\Filters\Enumerations\ActionType::FORWARD
		)))
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
			case \RainLoop\Providers\Filters\Enumerations\ActionType::VACATION:
				$sValue = \trim($oFilter->ActionValue());
				$sValueSecond = \trim($oFilter->ActionValueSecond());
				$sValueThird = \trim($oFilter->ActionValueThird());
				$sValueFourth = \trim($oFilter->ActionValueFourth());
				if (0 < \strlen($sValue))
				{
					$aCapa['vacation'] = true;

					$iDays = 1;
					$sSubject = '';
					if (0 < \strlen($sValueSecond))
					{
						$sSubject = ':subject "'.
							$this->quote(\MailSo\Base\Utils::StripSpaces($sValueSecond)).'" ';
					}

					if (0 < \strlen($sValueThird) && \is_numeric($sValueThird) && 1 < (int) $sValueThird)
					{
						$iDays = (int) $sValueThird;
					}

					$sAddresses = '';
					if (0 < \strlen($sValueFourth))
					{
						$self = $this;

						$aAddresses = \explode(',', $sValueFourth);
						$aAddresses = \array_filter(\array_map(function ($sEmail) use ($self) {
							$sEmail = \trim($sEmail);
							return 0 < \strlen($sEmail) ? '"'.$self->quote($sEmail).'"' : '';
						}, $aAddresses), 'strlen');

						if (0 < \count($aAddresses))
						{
							$sAddresses = ':addresses ['.\implode(', ', $aAddresses).'] ';
						}
					}

					$aResult[] = $sTab.'vacation :days '.$iDays.' '.$sAddresses.$sSubject.'"'.$this->quote($sValue).'";';
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
			case \RainLoop\Providers\Filters\Enumerations\ActionType::REJECT:
				$sValue = \trim($oFilter->ActionValue());
				if (0 < \strlen($sValue))
				{
					$aCapa['reject'] = true;

					$aResult[] = $sTab.'reject "'.$this->quote($sValue).'";';
					$aResult[] = $sTab.'stop;';
				}
				else
				{
					$aResult[] = $sTab.'# @Error (reject): empty action value';
				}
				break;
			case \RainLoop\Providers\Filters\Enumerations\ActionType::FORWARD:
				$sValue = $oFilter->ActionValue();
				if (0 < \strlen($sValue))
				{
					if ($oFilter->Keep())
					{
						$aCapa['fileinto'] = true;
						$aResult[] = $sTab.'fileinto "INBOX";';
					}

					$aResult[] = $sTab.'redirect "'.$this->quote($sValue).'";';
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
					$sFolderName = $sValue; // utf7-imap
					if ($this->bUtf8FolderName) // to utf-8
					{
						$sFolderName = \MailSo\Base\Utils::ConvertEncoding($sFolderName,
							\MailSo\Base\Enumerations\Charset::UTF_7_IMAP,
							\MailSo\Base\Enumerations\Charset::UTF_8);
					}

					$aCapa['fileinto'] = true;
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
	public function quote($sValue)
	{
		return \str_replace(array('\\', '"'), array('\\\\', '\\"'), \trim($sValue));
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 */
	public function SetLogger($oLogger)
	{
		$this->oLogger = $oLogger instanceof \MailSo\Log\Logger ? $oLogger : null;
	}
}
