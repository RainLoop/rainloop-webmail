<?php

namespace Sabre\VObject\TimezoneGuesser;

use Sabre\VObject\Component\VTimeZone;

interface TimezoneGuesser
{
    public function guess(VTimeZone $vtimezone, ?bool $failIfUncertain = false): ?\DateTimeZone;
}
