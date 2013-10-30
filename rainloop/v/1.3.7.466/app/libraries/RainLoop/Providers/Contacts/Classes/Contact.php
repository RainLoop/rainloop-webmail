<?php

namespace RainLoop\Providers\Contacts\Classes;

class Contact
{
	/**
	 * @var int
	 */
	public $IdContact;

	/**
	 * @var int
	 */
	public $IdUser;

	/**
	 * @var int
	 */
	public $Type;

	/**
	 * @var int
	 */
	public $Frec;

	/**
	 * @var string
	 */
	public $ListName;

	/**
	 * @var string
	 */
	public $Name;

	/**
	 * @var array
	 */
	public $Emails;

	/**
	 * @var string
	 */
	public $ImageHash;

	/**
	 * @var array
	 */
	public $Data;

	public function __construct()
	{
		$this->Clear();
	}

	public function Clear()
	{
		$this->IdContact = 0;
		$this->IdUser = 0;
		$this->Type = 0;
		$this->Frec = 0;
		$this->ListName = '';
		$this->Name = '';
		$this->ImageHash = '';
		$this->Emails = array();
		$this->Data = array();
	}

	/**
	 * @return string
	 */
	public function GenarateListName()
	{
		return 0 < \strlen($this->Name) ? $this->Name : (!empty($this->Emails[0]) ? $this->Emails[0] : '');
	}

	/**
	 * @return string
	 */
	public function EmailsAsString()
	{
		return \trim(\implode(' ', $this->Emails));
	}

	/**
	 * @return string
	 */
	public function DataAsString()
	{
		return @\serialize($this->Data);
	}

	/**
	 * @param string $sData
	 */
	public function ParseData($sData)
	{
		$sData = (string) $sData;
		$sData = \trim($sData);
		
		if (!empty($sData))
		{
			$aData = @\unserialize($sData);
			if (\is_array($aData))
			{
				$this->Data = $aData;
			}
		}
	}
}
