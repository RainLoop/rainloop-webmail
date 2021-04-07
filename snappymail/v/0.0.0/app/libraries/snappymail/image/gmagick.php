<?php

namespace SnappyMail\Image;

if (!\class_exists('Gmagick',false)) { return; }

class GMagick extends \Gmagick implements \SnappyMail\Image
{
	private
		$orientation = 1;

	function __destruct()
	{
		$this->clear();
	}

	public static function createFromString(string $data)
	{
		$gmagick = new static();
		if (!$gmagick->readimageblob($data)) {
			throw new \InvalidArgumentException('Failed to load image');
		}
		if (\is_callable('exif_read_data')) {
			$exif = \exif_read_data('data://'.$imginfo['mime'].';base64,' . \base64_encode($data));
			if ($exif) {
				$gmagick->orientation = \max(1, \intval($oMetadata['IFD0.Orientation'] ?? 0));
			}
		}
		return $gmagick;
	}

	public function rotate(float $degrees) : bool
	{
		return $this->rotateImage(new \GmagickPixel(), $degrees);
	}

	public function getImageMimeType()
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
		return false;
	}

	public function getImageOrientation() : int
	{
		return $this->orientation;
	}
}
