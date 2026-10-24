<?php

namespace SnappyMail\Image;

if (!\class_exists('Gmagick',false)) { return; }

class GMagick extends \Gmagick implements \SnappyMail\Image
{
	private
		$orientation = 0;

	function __destruct()
	{
		$this->clear();
	}

	public function valid() : bool
	{
		return 0 < $this->getImageWidth();
	}

	public static function createFromString(string &$data)
	{
		$gmagick = new static();
		if (!$gmagick->readimageblob($data)) {
			throw new \InvalidArgumentException('Failed to load image');
		}
		if (\method_exists($gmagick, 'getImageOrientation')) {
			$gmagick->orientation = $gmagick->getImageOrientation();
		} else {
			$gmagick->orientation = Exif::getImageOrientation($data);
		}
		return $gmagick;
	}

	public static function createFromStream($fp)
	{
		if (!\method_exists('Gmagick', 'getImageOrientation')) {
			$data = \stream_get_contents($fp);
			return static::createFromString($data);
		}
		$gmagick = new static();
		if (!$gmagick->readimagefile($fp)) {
			throw new \InvalidArgumentException('Failed to load image');
		}
		$gmagick->orientation = $gmagick->getImageOrientation();
		return $gmagick;
	}

	public function getOrientation() : int
	{
		return $this->orientation;
	}

	public function rotate(float $degrees) : bool
	{
		return $this->rotateImage(new \GmagickPixel(), $degrees);
	}

	public function show(?string $format = null) : void
	{
		$format && $this->setImageFormat($format);
		\header('Content-Type: ' . $this->getImageMimeType());
		echo $this;
	}

	public function getImageMimeType() : string
	{
		switch (\strtolower(parent::getImageFormat()))
		{
		case 'png':
		case 'png8':
		case 'png24':
		case 'png32':
			return 'image/png';
		case 'jpeg':
			return 'image/jpeg';
		case 'gif':
			return 'image/gif';
		case 'webp':
			return 'image/webp';
		}
		return 'application/octet-stream';
	}
}
