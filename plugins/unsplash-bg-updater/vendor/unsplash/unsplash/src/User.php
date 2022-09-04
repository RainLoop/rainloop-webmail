<?php

namespace Crew\Unsplash;

/**
 * Class User
 * @package Crew\Unsplash
 * @property string $username
 */
class User extends Endpoint
{
    private $photos;

    private $likes;

    private $collections;

    /**
     * Retrieve a User object from the username specified
     *
     * @param string $username Username of the user
     * @return User
     */
    public static function find($username)
    {
        $user = json_decode(self::get("/users/{$username}")->getBody(), true);
        
        return new self($user);
    }

    /**
     * Retrieve all the photos for a specific user on a given page.
     * Returns an ArrayObject that contains Photo objects.
     *
     * @param integer $page Page from which the photos are to be retrieved
     * @param integer $per_page Number of elements on a page
     * @param string $order_by Order in which to retrieve photos
     * @return ArrayObject of Photos
     */
    public function photos($page = 1, $per_page = 10, $order_by = 'latest')
    {
        if (! isset($this->photos["{$page}-{$per_page}-{$order_by}"])) {
            $photos = self::get("/users/{$this->username}/photos", [
                'query' => ['page' => $page, 'per_page' => $per_page, 'order_by' => $order_by]
            ]);
        
            $this->photos["{$page}-{$per_page}-{$order_by}"] = [
                'body' => self::getArray($photos->getBody(), __NAMESPACE__.'\\Photo'),
                'headers' => $photos->getHeaders()
            ];
        }

        return new ArrayObject(
            $this->photos["{$page}-{$per_page}-{$order_by}"]['body'],
            $this->photos["{$page}-{$per_page}-{$order_by}"]['headers']
        );
    }

    /**
     * Retrieve all the collections for a specific user on a given page.
     * Returns an ArrayObject that contains Collection objects.
     *
     * Include private collection if it's the user bearer token
     *
     * @param    integer $page Page from which the collections are to be retrieved
     * @param    integer $per_page Number of elements on a page
     * @return   ArrayObject of Collections
     */
    public function collections($page = 1, $per_page = 10)
    {
        if (! isset($this->collections["{$page}-{$per_page}"])) {
            $collections = self::get(
                "/users/{$this->username}/collections",
                ['query' => ['page' => $page, 'per_page' => $per_page]]
            );
        
            $this->collections["{$page}-{$per_page}"] = [
                'body' => self::getArray($collections->getBody(), __NAMESPACE__.'\\Collection'),
                'headers' => $collections->getHeaders()
            ];
        }

        return new ArrayObject(
            $this->collections["{$page}-{$per_page}"]['body'],
            $this->collections["{$page}-{$per_page}"]['headers']
        );
    }

    /**
     * Retrieve all the photos liked by a specific user on a given page.
     * Returns an ArrayObject that contains Photo object
     *
     * @param    integer $page Page from which the photos are to be retrieved
     * @param    integer $per_page Number of elements on a page
     * @param string $order_by Order in which to retrieve photos
     * @return ArrayObject of Photos
     */
    public function likes($page = 1, $per_page = 10, $order_by = 'latest')
    {
        if (! isset($this->likes["{$page}-{$per_page}-{$order_by}"])) {
            $likes = self::get("/users/{$this->username}/likes", [
                'query' => ['page' => $page, 'per_page' => $per_page, 'order_by' => $order_by]
            ]);
        
            $this->likes["{$page}-{$per_page}-{$order_by}"] = [
                'body' => self::getArray($likes->getBody(), __NAMESPACE__.'\\Photo'),
                'headers' => $likes->getHeaders()
            ];
        }

        return new ArrayObject(
            $this->likes["{$page}-{$per_page}-{$order_by}"]['body'],
            $this->likes["{$page}-{$per_page}-{$order_by}"]['headers']
        );
    }

     /**
     * Retrieve a User object of the logged-in user.
     *
     * @return User
     */
    public static function current()
    {
        $user = json_decode(self::get("/me")->getBody(), true);
        
        return new self($user);
    }

    /**
     * Update specific parameters on the logged-in user
     *
     * @param    array $parameters Array containing the parameters to update
     * @return void
     */
    public function update(array $parameters)
    {
        json_decode(self::put("/me", ['query' => $parameters])->getBody(), true);
        parent::update($parameters);
    }

    /**
     * Return url for user's portfolio page
     * @param $username
     * @return string
     */
    public static function portfolio($username)
    {
        $user = json_decode(self::get("/users/{$username}/portfolio")->getBody(), true);
        return $user['url'];
    }

    /**
     * Return statistics for user
     * @param string $resolution
     * @param int $quantity
     * @return ArrayObject
     */
    public function statistics($resolution = 'days', $quantity = 30)
    {
        $statistics = self::get("users/{$this->username}/statistics", ['query' => ['resolution' => $resolution, 'quantity' => $quantity]]);
        $statisticsArray = self::getArray($statistics->getBody(), Stat::class);
        return new ArrayObject($statisticsArray, $statistics->getHeaders());
    }
}
