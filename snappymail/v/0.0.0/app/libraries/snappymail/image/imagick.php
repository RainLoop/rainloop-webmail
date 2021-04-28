<?php

namespace SnappyMail\Image;

if (!\class_exists('Imagick',false)) { return; }

class IMagick extends \Imagick implements \SnappyMail\Image
{
	function __destruct()
	{
		$this->clear();
	}

	public static function createFromString(string &$data)
	{
		$imagick = new static();
		if (!$imagick->readImageBlob($data)) {
			throw new \InvalidArgumentException('Failed to load image');
		}
		$imagick->setImageMatte(true);
		return $imagick;
	}

	public function getOrientation() : int
	{
		return $this->getImageOrientation();
	}

	public function rotate(float $degrees) : bool
	{
		return $this->rotateImage(new \ImagickPixel(), $degrees);
	}

	public function show(?string $format = null) : void
	{
		$format && $this->setImageFormat($format);
		\header('Content-Type: ' . $this->getImageMimeType());
		echo $this;
	}
}
