<?php

namespace RainLoop\Providers\Filters;

class SieveStorage implements FiltersInterface
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
	 * @var \RainLoop\Config\Application
	 */
	private $oConfig;

	/**
	 * @var bool
	 */
	private $bUtf8FolderName;

	public function __construct($oPlugins, $oConfig)
	{
		$this->oLogger = null;

		$this->oPlugins = $oPlugins;
		$this->oConfig = $oConfig;

		$this->bUtf8FolderName = !!$this->oConfig->Get('labs', 'sieve_utf8_folder_name', true);
	}

	protected function getConnection(\RainLoop\Model\Account $oAccount) : ?\MailSo\Sieve\ManageSieveClient
	{
		$oSieveClient = new \MailSo\Sieve\ManageSieveClient();
		$oSieveClient->SetLogger($this->oLogger);
		$oSieveClient->SetTimeOuts(10, (int) \RainLoop\Api::Config()->Get('labs', 'sieve_timeout', 10));
		return $oAccount->SieveConnectAndLoginHelper($this->oPlugins, $oSieveClient, $this->oConfig)
			 ? $oSieveClient
			 : null;
	}

	public function Load(\RainLoop\Model\Account $oAccount, bool $bAllowRaw = false) : array
	{
		$aModules = array();
		$aScripts = array();

		$oSieveClient = $this->getConnection($oAccount);
		if ($oSieveClient) {
			$aModules = $oSieveClient->Modules();
			\sort($aModules);

			$aList = $oSieveClient->ListScripts();

			foreach ($aList as $name => $active) {
				if ($name != self::SIEVE_FILE_NAME) {
					if ($bAllowRaw) {
						$aScripts[$name] = array(
							'@Object' => 'Object/SieveScript',
							'name' => $name,
							'active' => $active,
							'body' => $oSieveClient->GetScript($name) // \trim() ?
						);
					}
				} else {
					$sS = $oSieveClient->GetScript(self::SIEVE_FILE_NAME);
					if ($sS) {
						$aFilters = $this->fileStringToCollection($sS);
					}
					$aScripts[$name] = array(
						'@Object' => 'Object/SieveScript',
						'name' => $name,
						'active' => $active,
						'body' => $oSieveClient->GetScript($name), // \trim() ?
						'filters' => $aFilters
					);
				}
			}

			$oSieveClient->LogoutAndDisconnect();
		}

		if (!isset($aList[self::SIEVE_FILE_NAME])) {
			$aScripts[$name] = array(
				'@Object' => 'Object/SieveScript',
				'name' => self::SIEVE_FILE_NAME,
				'active' => false,
				'body' => '',
				'filters' => []
			);
		}

		if ($bAllowRaw && !isset($aList[self::SIEVE_FILE_NAME_RAW])) {
			$aScripts[$name] = array(
				'@Object' => 'Object/SieveScript',
				'name' => self::SIEVE_FILE_NAME_RAW,
				'active' => false,
				'body' => ''
			);
		}

		\ksort($aScripts);

		return array(
			'Capa' => $aModules,
			'Scripts' => $aScripts
		);
	}

	public function Save(\RainLoop\Model\Account $oAccount, string $sScriptName, array $aFilters, string $sRaw = '') : bool
	{
		if (self::SIEVE_FILE_NAME === $sScriptName) {
			$sRaw = $this->collectionToFileString($aFilters);
		}
		$oSieveClient = $this->getConnection($oAccount);
		if ($oSieveClient) {
			if (empty($sRaw)) {
				$aList = $oSieveClient->ListScripts();
				if (isset($aList[$sScriptName])) {
					$oSieveClient->DeleteScript($sScriptName);
				}
			} else {
				$oSieveClient->PutScript($sScriptName, $sRaw);
			}
			$oSieveClient->LogoutAndDisconnect();
			return true;
		}
		return false;
	}

	/**
	 * If $sScriptName is the empty string (i.e., ""), then any active script is disabled.
	 */
	public function Activate(\RainLoop\Model\Account $oAccount, string $sScriptName) : bool
	{
		$oSieveClient = $this->getConnection($oAccount);
		if ($oSieveClient) {
			$oSieveClient->SetActiveScript(\trim($sScriptName));
			return true;
		}
		return false;
	}

	public function Delete(\RainLoop\Model\Account $oAccount, string $sScriptName) : bool
	{
		$oSieveClient = $this->getConnection($oAccount);
		if ($oSieveClient) {
			$oSieveClient->DeleteScript(\trim($sScriptName));
			return true;
		}
		return false;
	}

	private function conditionToSieveScript(Classes\FilterCondition $oCondition, array &$aCapa) : string
	{
		$sResult = '';
		$sTypeWord = '';
		$bTrue = true;

		$sValue = \trim($oCondition->Value());
		$sValueSecond = \trim($oCondition->ValueSecond());

		if (0 < \strlen($sValue) ||
			(0 < \strlen($sValue) && 0 < \strlen($sValueSecond) &&
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
					$sResult .= 'header '.$sTypeWord.' ["'.$this->quote($sValueSecond).'"]';
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
					$self = $this;
					$aValue = \array_map(function ($sValue) use ($self) {
						return '"'.$self->quote(\trim($sValue)).'"';
					}, \explode(',', $sValue));

					$sResult .= ' ['.\trim(\implode(', ', $aValue)).']';
				}
				else if (Enumerations\ConditionField::SIZE === $oCondition->Field())
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

	private function filterToSieveScript(Classes\Filter $oFilter, array &$aCapa) : string
	{
		$sNL = static::NEW_LINE;
		$sTab = '    ';

		$bAll = false;
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
			case Enumerations\ActionType::REJECT:
				$sValue = \trim($oFilter->ActionValue());
				if (0 < \strlen($sValue))
				{
					$aCapa['reject'] = true;

					$aResult[] = $sTab.'reject "'.$this->quote($sValue).'";';
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
				if (0 < \strlen($sValue))
				{
					if ($oFilter->Keep())
					{
						$aCapa['fileinto'] = true;
						$aResult[] = $sTab.'fileinto "INBOX";';
					}

					$aResult[] = $sTab.'redirect "'.$this->quote($sValue).'";';
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

		if (!$bAll)
		{
			$aResult[] = '}';
		}

		return \implode($sNL, $aResult);
	}

	private function collectionToFileString(array $aFilters) : string
	{
		$sNL = static::NEW_LINE;

		$aCapa = array();
		$aParts = array();

		$aParts[] = '# This is SnappyMail sieve script.';
		$aParts[] = '# Please don\'t change anything here.';
		$aParts[] = '# RAINLOOP:SIEVE';
		$aParts[] = '';

		foreach ($aFilters as /* @var $oItem \RainLoop\Providers\Filters\Classes\Filter */ $oItem)
		{
			$aData = array();
			$aData[] = '/*';
			$aData[] = 'BEGIN:FILTER:'.$oItem->ID();
			$aData[] = 'BEGIN:HEADER';
			$aData[] = \chunk_split(\base64_encode(\json_encode($oItem)), 74, $sNL).'END:HEADER';
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

	private function fileStringToCollection(string $sFileString) : array
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

	public function quote(string $sValue) : string
	{
		return \str_replace(array('\\', '"'), array('\\\\', '\\"'), \trim($sValue));
	}

	public function SetLogger(?\MailSo\Log\Logger $oLogger)
	{
		$this->oLogger = $oLogger;
	}
}
