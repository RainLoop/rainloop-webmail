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
	 * 
	 * @return \RainLoop\Plugins\Property
	 */
	public static function NewInstance(string $sName)
	{
		return new self($sName);
	}
	
	/**
	 * 
	 * @return \RainLoop\Plugins\Property
	 */
	public function SetType(int $iType)
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
	 *
	 * @return \RainLoop\Plugins\Property
	 */
	public function SetPlaceholder(string $sPlaceholder)
	{
		$this->sPlaceholder = $sPlaceholder;

		return $this;
	}
	
	/**
	 * 
	 * @return \RainLoop\Plugins\Property
	 */
	public function SetLabel(string $sLabel)
	{
		$this->sLabel = $sLabel;
		
		return $this;
	}

	/**
	 *
	 * @return \RainLoop\Plugins\Property
	 */
	public function SetDescription(string $sDesc)
	{
		$this->sDesc = $sDesc;

		return $this;
	}

	/**
	 * @return \RainLoop\Plugins\Property
	 */
	public function SetAllowedInJs(bool $bValue = true)
	{
		$this->bAllowedInJs = !!$bValue;

		return $this;
	}

	public function Name() : string
	{
		return $this->sName;
	}

	public function AllowedInJs() : bool
	{
		return $this->bAllowedInJs;
	}

	public function Description() : string
	{
		return $this->sDesc;
	}

	public function Label() : string
	{
		return $this->sLabel;
	}

	public function Type() : int
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

	public function Placeholder() : string
	{
		return $this->sPlaceholder;
	}

	public function ToArray() : array
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
