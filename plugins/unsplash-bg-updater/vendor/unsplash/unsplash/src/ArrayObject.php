<?php

namespace Crew\Unsplash;

/**
 * Class ArrayObject
 * @package Crew\Unsplash
 */
class ArrayObject extends \ArrayObject
{
    /**
     * @var array
     */
    private $headers;

    /**
     * @var array
     */
    private $pages = [];

    /**
     * @var array
     */
    private $basePages = [
        self::LAST => null,
        self::PREV => null,
        self::NEXT => null,
        self::FIRST => null
    ];

    const LAST = 'last';
    const PREV = 'prev';
    const NEXT = 'next';
    const FIRST = 'first';

    const LINK = 'Link';

    const TOTAL = 'X-Total';

    const PER_PAGE = 'X-Per-Page';
    
    const RATE_LIMIT_REMAINING = 'X-Ratelimit-Remaining';

    /**
     * @param array|object $input
     * @param array $headers
     */
    public function __construct($input, $headers)
    {
        $this->headers = $headers;
        // Preload pages array to be used from other method
        if (isset($headers[self::LINK][0])) {
            $this->generatePages();
        }

        parent::__construct($input);
    }

    /**
     * Total number of pages for this call
     * @return int Total page
     */
    public function totalPages()
    {
        $total = $this->totalObjects();
        $perPage = $this->objectsPerPage();

        return (int) ceil($total / $perPage);
    }

    /**
     * Total of object in the collections
     * Value come from X-Total header's value
     * @return int Number of Objects
     */
    public function totalObjects()
    {
        $total = 0;
        if (!empty($this->headers[self::TOTAL]) && is_array($this->headers[self::TOTAL])) {
            $total = (int) $this->headers[self::TOTAL][0];
        }

        return $total;
    }

    /**
     * Number of element per page
     * @return int element per page
     */
    public function objectsPerPage()
    {
        $perPage = 10;
        if (!empty($this->headers[self::PER_PAGE]) && is_array($this->headers[self::PER_PAGE])) {
            $perPage = (int) $this->headers[self::PER_PAGE][0];
        }

        return $perPage;
    }

    /**
     * Current page number based on the Link header
     * @return int Current page number
     */
    public function currentPage()
    {
        if (isset($this->pages[self::NEXT])) {
            $page = $this->pages[self::NEXT] - 1;
        } else {
            $page = $this->pages[self::PREV] + 1;
        }

        return $page;
    }

    /**
     * Retrieve array containing all pages for each position
     * @return array
     */
    public function getPages()
    {
        return array_merge($this->basePages, $this->pages);
    }

    /**
     * Return an array containing the page number for all positions:
     * last, previous, next, first
     * If the page number for a specific position doesn't exist (i.e it is the current page),
     * the position will return null
     * @return array
     */
    private function generatePages()
    {
        $links = explode(',', $this->headers[self::LINK][0]);

        foreach ($links as $link) {
            // Run two preg_match to retrieve specific element in the string
            // snce the page attributes is not always at the same position,
            // we can't retireve both information in the same regex
            preg_match('/page=([^&>]*)/', $link, $page);
            preg_match('/rel="([a-z]+)"/', $link, $rel);

            if ($page[1] !== null && $rel[1] !== null) {
                $this->pages[$rel[1]] = $page[1];
            }
        }

        $this->pagesProcessed = true;

        return $this->pages;
    }

    /**
     * Return the rate limit remaining
     * @return int
     */
    public function rateLimitRemaining()
    {
        return intval($this->headers[self::RATE_LIMIT_REMAINING][0]);
    }
}
