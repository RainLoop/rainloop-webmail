<?php

namespace RainLoop\Providers\AddressBook\Classes;

class Tag
{
	/**
	 * @var string
	 */
	public $IdContactTag;

	/**
	 * @var string
	 */
	public $Name;

	/**
	 * @var bool
	 */
	public $ReadOnly;

	public function __construct()
	{
		$this->Clear();
	}

	public function Clear()
	{
		$this->IdContactTag = '';
		$this->Name = '';
		$this->ReadOnly = false;
	}
}
