<?php

declare(strict_types=1);

namespace Sabre\VObject\TimezoneGuesser;

/**
 * Some clients add 'X-LIC-LOCATION' with the olson name.
 */
class FindFromOffset implements TimezoneFinder
{
    public function find(string $tzid, ?bool $failIfUncertain = false): ?\DateTimeZone
    {
        // Maybe the author was hyper-lazy and just included an offset. We
        // support it, but we aren't happy about it.
        if (preg_match('/^GMT(\+|-)([0-9]{4})$/', $tzid, $matches)) {
            // Note that the path in the source will never be taken from PHP 5.5.10
            // onwards. PHP 5.5.10 supports the "GMT+0100" style of format, so it
            // already gets returned early in this function. Once we drop support
            // for versions under PHP 5.5.10, this bit can be taken out of the
            // source.
            // @codeCoverageIgnoreStart
            return new \DateTimeZone('Etc/GMT'.$matches[1].ltrim(substr($matches[2], 0, 2), '0'));
            // @codeCoverageIgnoreEnd
        }

        if (0 === strncasecmp($tzid, 'UTC', 3)) {
            $offset = substr($tzid, 3);
            if (6 === strlen($offset) && ':' === $offset[3]) {
                $offset = substr($offset, 0, 3).substr($offset, 4);
            }

            if (5 !== strlen($offset)
                || ('+' !== $offset[0] && '-' !== $offset[0])
                || 4 !== strspn(substr($offset, 1), '0123456789')
                || (int) substr($offset, 1, 2) > 23
                || (int) substr($offset, 3, 2) > 59
            ) {
                return null;
            }

            return new \DateTimeZone($offset);
        }

        return null;
    }
}
