// GPG4Browsers - An OpenPGP implementation in javascript
// Copyright (C) 2011 Recurity Labs GmbH
//
// This library is free software; you can redistribute it and/or
// modify it under the terms of the GNU Lesser General Public
// License as published by the Free Software Foundation; either
// version 3.0 of the License, or (at your option) any later version.
//
// This library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public
// License along with this library; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA

/**
 * Implementation of the Compressed Data Packet (Tag 8)<br/>
 * <br/>
 * {@link http://tools.ietf.org/html/rfc4880#section-5.6|RFC4880 5.6}: The Compressed Data packet contains compressed data.  Typically,
 * this packet is found as the contents of an encrypted packet, or following
 * a Signature or One-Pass Signature packet, and contains a literal data packet.
 * @requires compression/zlib
 * @requires compression/rawinflate
 * @requires compression/rawdeflate
 * @requires enums
 * @requires util
 * @module packet/compressed
 */

'use strict';

import enums from '../enums.js';
import util from '../util.js';
import '../compression/zlib.min.js';

/**
 * @constructor
 */
export default class Compressed
{
  constructor()
  {
    /**
     * Packet type
     * @type {module:enums.packet}
     */
    this.tag = enums.packet.compressed;
    /**
     * List of packets
     * @type {module:packet/packetlist}
     */
    this.packets = null;
    /**
     * Compression algorithm
     * @type {compression}
     */
    this.algorithm = 'zip';

    /**
     * Compressed packet data
     * @type {String}
     */
    this.compressed = null;
  }

  /**
   * Parsing function for the packet.
   * @param {String} bytes Payload of a tag 8 packet
   */
  read(bytes) {
    // One octet that gives the algorithm used to compress the packet.
    this.algorithm = enums.read(enums.compression, bytes[0]);

    // Compressed data, which makes up the remainder of the packet.
    this.compressed = bytes.subarray(1, bytes.length);

    this.decompress();
  }



  /**
   * Return the compressed packet.
   * @return {String} binary compressed packet
   */
  write() {
    if (this.compressed === null) {
      this.compress();
    }

    return util.concatUint8Array(new Uint8Array([enums.write(enums.compression, this.algorithm)]), this.compressed);
  }


  /**
   * Decompression method for decompressing the compressed data
   * read by read_packet
   */
  decompress() {
    var decompressed;

    switch (this.algorithm) {
      case 'uncompressed':
        decompressed = this.compressed;
        break;

      case 'zip':
        decompressed = (new Zlib.RawInflate(this.compressed)).decompress();
        break;

      case 'zlib':
        decompressed = (new Zlib.Inflate(this.compressed)).decompress();
        break;

      case 'bzip2':
        // TODO: need to implement this
        throw new Error('Compression algorithm BZip2 [BZ2] is not implemented.');

      default:
        throw new Error("Compression algorithm unknown :" + this.algorithm);
    }

    this.packets.read(decompressed);
  }

  /**
   * Compress the packet data (member decompressedData)
   */
  compress() {
    var uncompressed = this.packets.write();

    switch (this.algorithm) {

      case 'uncompressed':
        // - Uncompressed
        this.compressed = uncompressed;
        break;

      case 'zip':
        // - ZIP [RFC1951]
        this.compressed = (new Zlib.RawDeflate(uncompressed)).compress();
        break;

      case 'zlib':
        // - ZLIB [RFC1950]
        this.compressed = (new Zlib.Deflate(uncompressed)).compress();
        break;

      case 'bzip2':
        //  - BZip2 [BZ2]
        // TODO: need to implement this
        throw new Error("Compression algorithm BZip2 [BZ2] is not implemented.");

      default:
        throw new Error("Compression algorithm unknown :" + this.type);
    }
  }
}
