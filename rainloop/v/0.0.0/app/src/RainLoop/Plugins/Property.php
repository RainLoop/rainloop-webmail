<?php

namespace RainLoop\Plugins;

class Property
{
	/**
	 * @var string
	 */
	private $sName;
	
	/**
	 * @var string
	 */
	private $sLabel;

	/**
	 * @var string
	 */
	private $sDesc;
	
	/**
	 * @var int
	 */
	private $iType;

	/**
	 * @var bool
	 */
	private $bAllowedInJs;
	
	/**
	 * @var mixed
	 */
	private $mDefaultValue;

	/**
	 * @var string
	 */
	private $sPlaceholder;
	
	private function __construct($sName)
	{
		$this->sName = $sName;
		$this->iType = \RainLoop\Enumerations\PluginPropertyType::STRING;
		$this->mDefaultValue = '';
		$this->sLabel = '';
		$this->sDesc = '';
		$this->bAllowedInJs = false;
		$this->sPlaceholder = '';
	}
	
	/**
	 * @param string $sName
	 * 
	 * @return \RainLoop\Plugins\Property
	 */
	public static function NewInstance($sName)
	{
		return new self($sName);
	}
	
	/**
	 * @param int $iType
	 * 
	 * @return \RainLoop\Plugins\Property
	 */
	public function SetType($iType)
	{
		$this->iType = (int) $iType;
		
		return $this;
	}
	
	/**
	 * @param mixed $mDefaultValue
	 * 
	 * @return \RainLoop\Plugins\Property
	 */
	public function SetDefaultValue($mDefaultValue)
	{
		$this->mDefaultValue = $mDefaultValue;
		
		return $this;
	}

	/**
	 * @param string $sPlaceholder
	 *
	 * @return \RainLoop\Plugins\Property
	 */
	public function SetPlaceholder($sPlaceholder)
	{
		$this->sPlaceholder = $sPlaceholder;

		return $this;
	}
	
	/**
	 * @param string $sLabel
	 * 
	 * @return \RainLoop\Plugins\Property
	 */
	public function SetLabel($sLabel)
	{
		$this->sLabel = $sLabel;
		
		return $this;
	}

	/**
	 * @param string $sDesc
	 *
	 * @return \RainLoop\Plugins\Property
	 */
	public function SetDescription($sDesc)
	{
		$this->sDesc = $sDesc;

		return $this;
	}

	/**
	 * @param bool $bValue = true
	 * @return \RainLoop\Plugins\Property
	 */
	public function SetAllowedInJs($bValue = true)
	{
		$this->bAllowedInJs = !!$bValue;

		return $this;
	}
	
	/**
	 * @return string
	 */
	public function Name()
	{
		return $this->sName;
	}

	/**
	 * @return bool
	 */
	public function AllowedInJs()
	{
		return $this->bAllowedInJs;
	}
	
	/**
	 * @return string
	 */
	public function Description()
	{
		return $this->sDesc;
	}

	/**
	 * @return string
	 */
	public function Label()
	{
		return $this->sLabel;
	}
	
	/**
	 * @return int
	 */
	public function Type()
	{
		return $this->iType;
	}
	
	/**
	 * @return mixed
	 */
	public function DefaultValue()
	{
		return $this->mDefaultValue;
	}

	/**
	 * @return string
	 */
	public function Placeholder()
	{
		return $this->sPlaceholder;
	}
	
	/**
	 * @return array
	 */
	public function ToArray()
	{
		return array(
			 '',
			 $this->sName,
			 $this->iType,
			 $this->sLabel,
			 $this->mDefaultValue,
			 $this->sDesc,
			 $this->sPlaceholder
		);
	}
}
