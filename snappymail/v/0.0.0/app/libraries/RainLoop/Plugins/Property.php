<?php

namespace RainLoop\Plugins;

use \RainLoop\Enumerations\PluginPropertyType;

class Property implements \JsonSerializable
{
	private string $sName;

	/**
	 * @var mixed
	 */
	private $mValue;

	private string $sLabel = '';

	private string $sDesc = '';

	private int $iType = PluginPropertyType::STRING;

	private bool $bAllowedInJs = false;

	/**
	 * @var mixed
	 */
	private $mDefaultValue = '';

	private array $aOptions = [];

	private string $sPlaceholder = '';

	function __construct(string $sName)
	{
		$this->sName = $sName;
	}

	public static function NewInstance(string $sName) : self
	{
		return new self($sName);
	}

	public function SetType(int $iType) : self
	{
		$this->iType = (int) $iType;

		return $this;
	}

	/**
	 * @param mixed $mValue
	 */
	public function SetValue($mValue) : void
	{
		$this->mValue = null;
		switch ($this->iType) {
			case PluginPropertyType::INT:
				$this->mValue = (int) $mValue;
				break;
			case PluginPropertyType::BOOL:
				$this->mValue = !empty($mValue);
				break;
			case PluginPropertyType::SELECT:
				foreach ($this->aOptions as $option) {
					if ($mValue == $option['id']) {
						$this->mValue = (string) $mValue;
					}
				}
				break;
			case PluginPropertyType::SELECTION:
				if ($this->aOptions && \in_array($mValue, $this->aOptions)) {
					$this->mValue = (string) $mValue;
				}
				break;
			case PluginPropertyType::PASSWORD:
			case PluginPropertyType::STRING:
			case PluginPropertyType::STRING_TEXT:
			case PluginPropertyType::URL:
				$this->mValue = (string) $mValue;
				break;
//			case PluginPropertyType::GROUP:
//				throw new \Exception('Not allowed to set group value');
		}
	}

	/**
	 * @param mixed $mDefaultValue
	 */
	public function SetDefaultValue($mDefaultValue) : self
	{
		if (\is_array($mDefaultValue)) {
			$this->aOptions = $mDefaultValue;
		} else {
			$this->mDefaultValue = $mDefaultValue;
		}

		return $this;
	}

	public function SetOptions(array $aOptions) : self
	{
		$this->aOptions = $aOptions;

		return $this;
	}

	public function SetPlaceholder(string $sPlaceholder) : self
	{
		$this->sPlaceholder = $sPlaceholder;

		return $this;
	}

	public function SetLabel(string $sLabel) : self
	{
		$this->sLabel = $sLabel;

		return $this;
	}

	public function SetDescription(string $sDesc) : self
	{
		$this->sDesc = $sDesc;

		return $this;
	}

	public function SetAllowedInJs(bool $bValue = true) : self
	{
		$this->bAllowedInJs = $bValue;

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

	public function Options() : array
	{
		return $this->aOptions;
	}

	public function Placeholder() : string
	{
		return $this->sPlaceholder;
	}

	/**
	 * @return mixed
	 */
	public function Value()
	{
		return $this->mValue;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return array(
			'@Object' => 'Object/PluginProperty',
			'value' => $this->mValue,
			'placeholder' => $this->sPlaceholder,
			'Name' => $this->sName,
			'Type' => $this->iType,
			'Label' => $this->sLabel,
			'Default' => $this->mDefaultValue,
			'Options' => $this->aOptions,
			'Desc' => $this->sDesc
		);
	}
}
