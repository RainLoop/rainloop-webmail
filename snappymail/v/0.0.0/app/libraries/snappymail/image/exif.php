<?php

namespace SnappyMail\Image;

class Exif
{
/*
	const
		ORIENTATION_UNDEFINED   = 0,
		ORIENTATION_TOPLEFT     = 1,
		ORIENTATION_TOPRIGHT    = 2,
		ORIENTATION_BOTTOMRIGHT = 3,
		ORIENTATION_BOTTOMLEFT  = 4,
		ORIENTATION_LEFTTOP     = 5,
		ORIENTATION_RIGHTTOP    = 6,
		ORIENTATION_RIGHTBOTTOM = 7,
		ORIENTATION_LEFTBOTTOM  = 8;
*/
	public static function getImageOrientation(string &$data, array $image_info = null) : int
	{
		$image_info = empty($image_info['mime']) ? \getimagesizefromstring($data) : $image_info;
		if (!empty($image_info['mime']) && \IMG_JPG == $image_info[2] && \is_callable('exif_read_data')) {
			$exif = \exif_read_data('data://'.$image_info['mime'].';base64,' . \base64_encode($data));
			if (false !== $exif) {
				return \max(0, \intval($exif['IFD0.Orientation'] ?? 0));
			}
			\SnappyMail\Log::warning('EXIF', "{$image_info['mime']} " . \error_get_last()['message']);
		}
		return 0;
	}
}
