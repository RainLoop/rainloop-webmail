<?php

namespace Sabre\VObject\TimezoneGuesser;

interface TimezoneFinder
{
    public function find(string $tzid, ?bool $failIfUncertain = false): ?\DateTimeZone;
}
