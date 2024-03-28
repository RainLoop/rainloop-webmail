<?php

namespace SnappyMail\Image;

if (!\extension_loaded('gd')) { return; }

class GD2 implements \SnappyMail\Image
{
	protected
		$img = null;

	private
		$file,
		$format,
		$compression_q = 85,
		$orientation = 0,
		$type;

	function __destruct()
	{
		if ($this->img) {
			\imagedestroy($this->img);
			$this->img = null;
		}
	}

	function __toString()
	{
		return $this->getImageBlob();
	}

	public function valid() : bool
	{
		return $this->img && 0 < \imagesx($this->img);
	}

	public static function createFromString(string &$data)
	{
		if (!($imginfo = \getimagesizefromstring($data))) {
			throw new \InvalidArgumentException('Invalid image');
		}
		$format = '';
		switch ($imginfo[2])
		{
		case IMAGETYPE_GIF:  $format = 'gif';  break;
		case IMAGETYPE_JPEG: $format = 'jpeg'; break;
		case IMAGETYPE_PNG:  $format = 'png';  break;
		case IMAGETYPE_WEBP: $format = 'webp'; break;
		default: throw new \Exception('Unsupported fileformat: '.$imginfo['mime']);
		}
		$gd2 = new static();
		$gd2->img = \imagecreatefromstring($data);
		// resource or PHP8 GdImage
		if (!$gd2->img) {
			throw new \InvalidArgumentException('Failed to load image');
		}
		$gd2->file = 'blob';
		$gd2->type = (int) $imginfo[2];
		$gd2->format = $format;
		$gd2->orientation = Exif::getImageOrientation($data, $imginfo);
		return $gd2;
	}

	public static function createFromStream($fp)
	{
		$data = \stream_get_contents($fp);
		return static::createFromString($data);
	}

	public function getOrientation() : int
	{
		return $this->orientation;
	}

	public function rotate(float $degrees) : bool
	{
		return $this->rotateImage(0, $degrees);
	}

	public function show(?string $format = null) : void
	{
		$format && $this->setImageFormat($format);
		\header('Content-Type: ' . $this->getImageMimeType());
		$this->store_image(null);
	}

	private function store_image(?string $filename) : bool
	{
		switch ($this->format)
		{
		case 'png':
		case 'png8':
		case 'png24':
		case 'png32':
			\imagesavealpha($this->img, true);
			return \imagepng($this->img, $filename, 9);

		case 'jpg':
		case 'jpeg':
			return \imagejpeg($this->img, $filename, $this->compression_q);

		case 'gif':
			return \imagegif($this->img, $filename);

		case 'webp':
			if (!\imageistruecolor($this->img)) {
				\imagepalettetotruecolor($this->img);
				if (-1 < \imagecolortransparent($this->img)) {
					\imagealphablending($this->img, true);
					\imagesavealpha($this->img, true);
				}
			}
			return \imagewebp($this->img, $filename, $this->compression_q);
		}
		return false;
	}

	private function create_image($width = -1, $height = -1, $trueColor = null)
	{
		if (-1 == $width) { $width = \imagesx($this->img); }
		if (-1 == $height) { $height = \imagesy($this->img); }
		if ($trueColor || ($this->img && \imageistruecolor($this->img))) {
			$tmp_img = \imagecreatetruecolor($width, $height);
			\imagesavealpha($tmp_img, true);
			$trans_colour = \imagecolorallocatealpha($tmp_img, 0, 0, 0, 127);
			\imagefill($tmp_img, 0, 0, $trans_colour);
		} else {
			$tmp_img = \imagecreate($width, $height);
			\imagepalettecopy($tmp_img, $this->img);
			$t_clr_i = \imagecolortransparent($this->img);
			if (-1 !== $t_clr_i) {
				\imagecolortransparent($tmp_img, $t_clr_i);
				\imagefill($tmp_img, 0, 0, $t_clr_i);
			}
		}
		return $tmp_img;
	}

	/**
	 * Imagick PECL similar methods
	 */

	public function cropImage($width, $height, $x, $y)
	{
		$x = \min(\imagesx($this->img), \max(0, $x));
		$y = \min(\imagesy($this->img), \max(0, $y));
		$width   = \min($width,  \imagesx($this->img) - $x);
		$height  = \min($height, \imagesy($this->img) - $y);
		$tmp_img = $this->create_image($width, $height);
		if (!\imagecopy($tmp_img, $this->img, 0, 0, $x, $y, $width, $height)) {
			\imagedestroy($tmp_img);
			throw new \Exception('Failed image transformation: crop()');
		}
		\imagedestroy($this->img);
		$this->img = $tmp_img;
		return true;
	}

	public function cropThumbnailImage($width, $height)
	{
		$x = \imagesx($this->img);
		$y = \imagesy($this->img);
		$tx = $x/$width;
		$ty = $y/$height;
		if ($tx > $ty) {
			$x = \round($x/$ty);
			$this->thumbnailImage($x, $height);
			$x = \floor(($x-$width)/2);
			$y = 0;
		} else if ($tx < $ty) {
			$y = \round($y/$tx);
			$this->thumbnailImage($width, $y);
			$x = 0;
			$y = \floor(($y-$height)/2);
		} else {
			return $this->thumbnailImage($width, $height);
		}
		return $this->cropImage($width, $height, $x, $y);
	}

	public function flipImage()
	{
		return \imageflip($this->img, IMG_FLIP_VERTICAL);
	}

	public function flopImage()
	{
		return \imageflip($this->img, IMG_FLIP_HORIZONTAL);
	}

	public function getImageBlob()
	{
		\ob_start();
		if (!$this->store_image(null)) {
			\ob_end_clean();
			throw new \Exception('Failed to generate image blob');
		}
		return \ob_get_clean();
	}

	public function getImageMimeType() : string
	{
		switch ($this->format)
		{
		case 'png':
		case 'png8':
		case 'png24':
		case 'png32':
			return 'image/png';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'gif':
			return 'image/gif';
		case 'webp':
			return 'image/webp';
		}
		return 'application/octet-stream';
	}

	public function rotateImage($background, $degrees)
	{
		if (0 === ($degrees % 360)) { return true; }
		/** rotate clockwise */
		if (!\function_exists('imagerotate')) { require __DIR__ . '/gd2/imagerotate.inc'; }
		$tmp_img = \imagerotate($this->img, $degrees * -1, 0);
		if (!$tmp_img) { return false; }
		\imagedestroy($this->img);
		$this->img = $tmp_img;
		return true;
	}

	public function thumbnailImage($width, $height, $bestfit = false)
	{
		if (!$width && !$height) { return false; }
		if (0 > \min($width, $height)) { return false; }
		$x = \imagesx($this->img);
		$y = \imagesy($this->img);
		$tx = $width  ? $x/$width : 0;
		$ty = $height ? $y/$height : 0;
		if (!$width  || ($bestfit && $tx < $ty)) { $width  = \round($x / $ty); }
		if (!$height || ($bestfit && $tx > $ty)) { $height = \round($y / $tx); }
		$tmp_img = $this->create_image($width, $height);
		if (!$tmp_img) { return false; }
		\imagealphablending($tmp_img, false);
		if (!\imagecopyresampled($tmp_img, $this->img, 0, 0, 0, 0, $width, $height, $x, $y)) {
			if (!\imagecopyresized($tmp_img, $this->img, 0, 0, 0, 0, $width, $height, $x, $y)) {
				\imagedestroy($tmp_img);
				return false;
			}
		}
		\imagedestroy($this->img);
		$this->img = $tmp_img;
		return true;
	}

	public function setImageFormat($format) { $this->format = \strtolower($format); }

	public function stripImage() { return $this; }

}
