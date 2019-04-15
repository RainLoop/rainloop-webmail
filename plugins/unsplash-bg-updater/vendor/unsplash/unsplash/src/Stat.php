<?php

namespace Crew\Unsplash;

/**
 * Class Stat
 * @package Crew\Unsplash
 */
class Stat extends Endpoint
{
    /**
    * Retrieve the public global website stats
    *
    * @return Stat
    */
    public static function total()
    {
        $stat = json_decode(self::get("/stats/total")->getBody(), true);

        return new self($stat);
    }
}
