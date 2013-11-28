<?php

namespace RainLoop\Providers\PersonalAddressBook\Classes;

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
	 * @var string
	 */
	public $DisplayName;

	/**
	 * @var string
	 */
	public $DisplayEmail;

	/**
	 * @var string
	 */
	public $DisplayInList;

	/**
	 * @var bool
	 */
	public $IsAuto;

	/**
	 * @var bool
	 */
	public $IsShare;

	/**
	 * @var int
	 */
	public $Created;

	/**
	 * @var int
	 */
	public $Updated;

	/**
	 * @var array
	 */
	public $Tags;

	/**
	 * @var array
	 */
	public $Properties;

	public function __construct()
	{
		$this->Clear();
	}

	public function Clear()
	{
		$this->IdContact = 0;
		$this->IdUser = 0;
		$this->DisplayName = '';
		$this->DisplayEmail = '';
		$this->DisplayInList = '';
		$this->IsAuto = false;
		$this->IsShare = false;
		$this->Changed = \time();
		$this->Tags = array();
		$this->Properties = array();
	}
	
	public function InitBeforeWrite()
	{
		$sDisplayName = '';
		$sDisplayEmail = '';
		
		foreach ($this->Properties as /* @var $oProperty \RainLoop\Providers\PersonalAddressBook\Classes\Property */ $oProperty)
		{
			if ($oProperty)
			{
				$oProperty->InitBeforeWrite();
				
				if ('' === $sDisplayName && \RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType::FULLNAME === $oProperty->Type)
				{
					$sDisplayName = $oProperty->Value;
				}

				if ('' === $sDisplayEmail && $oProperty->IsEmail())
				{
					$sDisplayEmail = $oProperty->Value;
				}
			}
		}
		
		$this->DisplayName = $sDisplayName;
		$this->DisplayEmail = $sDisplayEmail;
		$this->DisplayInList = 0 < \strlen($this->DisplayName) ? $this->DisplayName : (!empty($this->DisplayEmail) ? $this->DisplayEmail : '');

		$this->Changed = \time();
	}
}
