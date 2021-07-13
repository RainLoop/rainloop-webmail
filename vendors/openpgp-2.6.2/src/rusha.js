(w => {
  'use strict';

  // The low-level RushCore module provides the heart of Rusha,
  // a high-speed sha1 implementation working on an Int32Array heap.
  // At first glance, the implementation seems complicated, however
  // with the SHA1 spec at hand, it is obvious this almost a textbook
  // implementation that has a few functions hand-inlined and a few loops
  // hand-unrolled.
  function RushaCore(stdlib$840, foreign$841, heap$842) {
    'use asm';
    let H$843 = new stdlib$840.Int32Array(heap$842);
    function hash$844(k$845, x$846) {
      // k in bytes
      k$845 = k$845 | 0;
      x$846 = x$846 | 0;
      let i$847 = 0, j$848 = 0, y0$849 = 0, z0$850 = 0, y1$851 = 0, z1$852 = 0, y2$853 = 0, z2$854 = 0, y3$855 = 0, z3$856 = 0, y4$857 = 0, z4$858 = 0, t0$859 = 0, t1$860 = 0;
      y0$849 = H$843[x$846 + 320 >> 2] | 0;
      y1$851 = H$843[x$846 + 324 >> 2] | 0;
      y2$853 = H$843[x$846 + 328 >> 2] | 0;
      y3$855 = H$843[x$846 + 332 >> 2] | 0;
      y4$857 = H$843[x$846 + 336 >> 2] | 0;
      for (i$847 = 0; (i$847 | 0) < (k$845 | 0); i$847 = i$847 + 64 | 0) {
        z0$850 = y0$849;
        z1$852 = y1$851;
        z2$854 = y2$853;
        z3$856 = y3$855;
        z4$858 = y4$857;
        for (j$848 = 0; (j$848 | 0) < 64; j$848 = j$848 + 4 | 0) {
          t1$860 = H$843[i$847 + j$848 >> 2] | 0;
          t0$859 = ((y0$849 << 5 | y0$849 >>> 27) + (y1$851 & y2$853 | ~y1$851 & y3$855) | 0) + ((t1$860 + y4$857 | 0) + 1518500249 | 0) | 0;
          y4$857 = y3$855;
          y3$855 = y2$853;
          y2$853 = y1$851 << 30 | y1$851 >>> 2;
          y1$851 = y0$849;
          y0$849 = t0$859;
          H$843[k$845 + j$848 >> 2] = t1$860;
        }
        for (j$848 = k$845 + 64 | 0; (j$848 | 0) < (k$845 + 80 | 0); j$848 = j$848 + 4 | 0) {
          t1$860 = (H$843[j$848 - 12 >> 2] ^ H$843[j$848 - 32 >> 2] ^ H$843[j$848 - 56 >> 2] ^ H$843[j$848 - 64 >> 2]) << 1 | (H$843[j$848 - 12 >> 2] ^ H$843[j$848 - 32 >> 2] ^ H$843[j$848 - 56 >> 2] ^ H$843[j$848 - 64 >> 2]) >>> 31;
          t0$859 = ((y0$849 << 5 | y0$849 >>> 27) + (y1$851 & y2$853 | ~y1$851 & y3$855) | 0) + ((t1$860 + y4$857 | 0) + 1518500249 | 0) | 0;
          y4$857 = y3$855;
          y3$855 = y2$853;
          y2$853 = y1$851 << 30 | y1$851 >>> 2;
          y1$851 = y0$849;
          y0$849 = t0$859;
          H$843[j$848 >> 2] = t1$860;
        }
        for (j$848 = k$845 + 80 | 0; (j$848 | 0) < (k$845 + 160 | 0); j$848 = j$848 + 4 | 0) {
          t1$860 = (H$843[j$848 - 12 >> 2] ^ H$843[j$848 - 32 >> 2] ^ H$843[j$848 - 56 >> 2] ^ H$843[j$848 - 64 >> 2]) << 1 | (H$843[j$848 - 12 >> 2] ^ H$843[j$848 - 32 >> 2] ^ H$843[j$848 - 56 >> 2] ^ H$843[j$848 - 64 >> 2]) >>> 31;
          t0$859 = ((y0$849 << 5 | y0$849 >>> 27) + (y1$851 ^ y2$853 ^ y3$855) | 0) + ((t1$860 + y4$857 | 0) + 1859775393 | 0) | 0;
          y4$857 = y3$855;
          y3$855 = y2$853;
          y2$853 = y1$851 << 30 | y1$851 >>> 2;
          y1$851 = y0$849;
          y0$849 = t0$859;
          H$843[j$848 >> 2] = t1$860;
        }
        for (j$848 = k$845 + 160 | 0; (j$848 | 0) < (k$845 + 240 | 0); j$848 = j$848 + 4 | 0) {
          t1$860 = (H$843[j$848 - 12 >> 2] ^ H$843[j$848 - 32 >> 2] ^ H$843[j$848 - 56 >> 2] ^ H$843[j$848 - 64 >> 2]) << 1 | (H$843[j$848 - 12 >> 2] ^ H$843[j$848 - 32 >> 2] ^ H$843[j$848 - 56 >> 2] ^ H$843[j$848 - 64 >> 2]) >>> 31;
          t0$859 = ((y0$849 << 5 | y0$849 >>> 27) + (y1$851 & y2$853 | y1$851 & y3$855 | y2$853 & y3$855) | 0) + ((t1$860 + y4$857 | 0) - 1894007588 | 0) | 0;
          y4$857 = y3$855;
          y3$855 = y2$853;
          y2$853 = y1$851 << 30 | y1$851 >>> 2;
          y1$851 = y0$849;
          y0$849 = t0$859;
          H$843[j$848 >> 2] = t1$860;
        }
        for (j$848 = k$845 + 240 | 0; (j$848 | 0) < (k$845 + 320 | 0); j$848 = j$848 + 4 | 0) {
          t1$860 = (H$843[j$848 - 12 >> 2] ^ H$843[j$848 - 32 >> 2] ^ H$843[j$848 - 56 >> 2] ^ H$843[j$848 - 64 >> 2]) << 1 | (H$843[j$848 - 12 >> 2] ^ H$843[j$848 - 32 >> 2] ^ H$843[j$848 - 56 >> 2] ^ H$843[j$848 - 64 >> 2]) >>> 31;
          t0$859 = ((y0$849 << 5 | y0$849 >>> 27) + (y1$851 ^ y2$853 ^ y3$855) | 0) + ((t1$860 + y4$857 | 0) - 899497514 | 0) | 0;
          y4$857 = y3$855;
          y3$855 = y2$853;
          y2$853 = y1$851 << 30 | y1$851 >>> 2;
          y1$851 = y0$849;
          y0$849 = t0$859;
          H$843[j$848 >> 2] = t1$860;
        }
        y0$849 = y0$849 + z0$850 | 0;
        y1$851 = y1$851 + z1$852 | 0;
        y2$853 = y2$853 + z2$854 | 0;
        y3$855 = y3$855 + z3$856 | 0;
        y4$857 = y4$857 + z4$858 | 0;
      }
      H$843[x$846 + 320 >> 2] = y0$849;
      H$843[x$846 + 324 >> 2] = y1$851;
      H$843[x$846 + 328 >> 2] = y2$853;
      H$843[x$846 + 332 >> 2] = y3$855;
      H$843[x$846 + 336 >> 2] = y4$857;
    }
    return { hash: hash$844 };
  }

  var core = /*#__PURE__*/Object.freeze({
    __proto__: null,
    RushaCore: RushaCore
  });

  /* eslint-env commonjs, browser */
  //
  // toHex
  //

  const precomputedHex = new Array(256);
  for (let i = 0; i < 256; i++) {
    precomputedHex[i] = (i < 0x10 ? '0' : '') + i.toString(16);
  }

  var toHex = (arrayBuffer) => {
    const binarray = new Uint8Array(arrayBuffer);
    const res = new Array(arrayBuffer.byteLength);
    for (let i = 0; i < res.length; i++) {
      res[i] = precomputedHex[binarray[i]];
    }
    return res.join('');
  };

  //
  // ceilHeapSize
  //

  var ceilHeapSize = (v) => {
    // The asm.js spec says:
    // The heap object's byteLength must be either
    // 2^n for n in [12, 24) or 2^24 * n for n ≥ 1.
    // Also, byteLengths smaller than 2^16 are deprecated.
    let p = 0;
    // If v is smaller than 2^16, the smallest possible solution
    // is 2^16.
    if (v <= 65536) return 65536;
    // If v < 2^24, we round up to 2^n,
    // otherwise we round up to 2^24 * n.
    if (v < 16777216) {
      for (p = 1; p < v; p = p << 1);
    } else {
      for (p = 16777216; p < v; p += 16777216);
    }
    return p;
  };

  //
  // isDedicatedWorkerScope
  //

  var isDedicatedWorkerScope = (self) => {
    const isRunningInWorker = 'WorkerGlobalScope' in self
      && self instanceof self.WorkerGlobalScope;
    const isRunningInSharedWorker = 'SharedWorkerGlobalScope' in self
      && self instanceof self.SharedWorkerGlobalScope;
    const isRunningInServiceWorker = 'ServiceWorkerGlobalScope' in self
      && self instanceof self.ServiceWorkerGlobalScope;

    // Detects whether we run inside a dedicated worker or not.
    //
    // We can't just check for `DedicatedWorkerGlobalScope`, since IE11
    // has a bug where it only supports `WorkerGlobalScope`.
    //
    // Therefore, we consider us as running inside a dedicated worker
    // when we are running inside a worker, but not in a shared or service worker.
    //
    // When new types of workers are introduced, we will need to adjust this code.
    return isRunningInWorker
      && !isRunningInSharedWorker
      && !isRunningInServiceWorker;
  };

  var utils = {
  	toHex: toHex,
  	ceilHeapSize: ceilHeapSize,
  	isDedicatedWorkerScope: isDedicatedWorkerScope
  };

  /* eslint-env commonjs, browser */
  let reader;
  if (typeof self !== 'undefined' && typeof self.FileReaderSync !== 'undefined') {
    reader = new self.FileReaderSync();
  }

  // Convert a binary string and write it to the heap.
  // A binary string is expected to only contain char codes < 256.
  const convStr = (str, H8, H32, start, len, off) => {
    let i, om = off % 4, lm = (len + om) % 4, j = len - lm;
    switch (om) {
    case 0: H8[off] = str.charCodeAt(start+3);
    case 1: H8[off+1-(om<<1)|0] = str.charCodeAt(start+2);
    case 2: H8[off+2-(om<<1)|0] = str.charCodeAt(start+1);
    case 3: H8[off+3-(om<<1)|0] = str.charCodeAt(start);
    }
    if (len < lm + (4-om)) {
      return;
    }
    for (i = 4 - om; i < j; i = i + 4 | 0) {
      H32[off+i>>2] = str.charCodeAt(start+i)   << 24 |
                      str.charCodeAt(start+i+1) << 16 |
                      str.charCodeAt(start+i+2) <<  8 |
                      str.charCodeAt(start+i+3);
    }
    switch (lm) {
    case 3: H8[off+j+1|0] = str.charCodeAt(start+j+2);
    case 2: H8[off+j+2|0] = str.charCodeAt(start+j+1);
    case 1: H8[off+j+3|0] = str.charCodeAt(start+j);
    }
  };

  // Convert a buffer or array and write it to the heap.
  // The buffer or array is expected to only contain elements < 256.
  const convBuf = (buf, H8, H32, start, len, off) => {
    let i, om = off % 4, lm = (len + om) % 4, j = len - lm;
    switch (om) {
    case 0: H8[off] = buf[start + 3];
    case 1: H8[off+1-(om<<1)|0] = buf[start+2];
    case 2: H8[off+2-(om<<1)|0] = buf[start+1];
    case 3: H8[off+3-(om<<1)|0] = buf[start];
    }
    if (len < lm + (4-om)) {
      return;
    }
    for (i = 4 - om; i < j; i = i + 4 | 0) {
      H32[off+i>>2|0] = buf[start+i]   << 24 |
                        buf[start+i+1] << 16 |
                        buf[start+i+2] <<  8 |
                        buf[start+i+3];
    }
    switch (lm) {
    case 3: H8[off+j+1|0] = buf[start+j+2];
    case 2: H8[off+j+2|0] = buf[start+j+1];
    case 1: H8[off+j+3|0] = buf[start+j];
    }
  };

  const convBlob = (blob, H8, H32, start, len, off) => {
    let i, om = off % 4, lm = (len + om) % 4, j = len - lm;
    const buf = new Uint8Array(reader.readAsArrayBuffer(blob.slice(start, start + len)));
    switch (om) {
    case 0: H8[off] = buf[3];
    case 1: H8[off+1-(om<<1)|0] = buf[2];
    case 2: H8[off+2-(om<<1)|0] = buf[1];
    case 3: H8[off+3-(om<<1)|0] = buf[0];
    }
    if (len < lm + (4-om)) {
      return;
    }
    for (i = 4 - om; i < j; i = i + 4 | 0) {
      H32[off+i>>2|0] = buf[i]   << 24 |
                        buf[i+1] << 16 |
                        buf[i+2] <<  8 |
                        buf[i+3];
    }
    switch (lm) {
    case 3: H8[off+j+1|0] = buf[j + 2];
    case 2: H8[off+j+2|0] = buf[j + 1];
    case 1: H8[off+j+3|0] = buf[j];
    }
  };

  var conv = (data, H8, H32, start, len, off) => {
    if (typeof data === 'string') {
      return convStr(data, H8, H32, start, len, off);
    }
    if (data instanceof Array) {
      return convBuf(data, H8, H32, start, len, off);
    }
    // Safely doing a Buffer check using "this" to avoid Buffer polyfill to be included in the dist
    if ((self||window).Buffer && Buffer.isBuffer(data)) {
      return convBuf(data, H8, H32, start, len, off);
    }
    if (data instanceof ArrayBuffer) {
      return convBuf(new Uint8Array(data), H8, H32, start, len, off);
    }
    if (data.buffer instanceof ArrayBuffer) {
      return convBuf(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), H8, H32, start, len, off);
    }
    if (data instanceof Blob) {
      return convBlob(data, H8, H32, start, len, off);
    }
    throw new Error('Unsupported data type.');
  };

  function getAugmentedNamespace(n) {
  	if (n.__esModule) return n;
  	var a = Object.defineProperty({}, '__esModule', {value: true});
  	Object.keys(n).forEach(function (k) {
  		var d = Object.getOwnPropertyDescriptor(n, k);
  		Object.defineProperty(a, k, d.get ? d : {
  			enumerable: true,
  			get: function () {
  				return n[k];
  			}
  		});
  	});
  	return a;
  }

  var RushaCore$1 = /*@__PURE__*/getAugmentedNamespace(core);

  /* eslint-env commonjs, browser */

  const {toHex: toHex$1, ceilHeapSize: ceilHeapSize$1} = utils;


  // Calculate the length of buffer that the sha1 routine uses
  // including the padding.
  const padlen = (len) => {
    for (len += 9; len % 64 > 0; len += 1);
    return len;
  };

  const padZeroes = (bin, len) => {
    const h8 = new Uint8Array(bin.buffer);
    const om = len % 4, align = len - om;
    switch (om) {
    case 0: h8[align + 3] = 0;
    case 1: h8[align + 2] = 0;
    case 2: h8[align + 1] = 0;
    case 3: h8[align + 0] = 0;
    }
    for (let i = (len >> 2) + 1; i < bin.length; i++) {
      bin[i] = 0;
    }
  };

  const padData = (bin, chunkLen, msgLen) => {
    bin[chunkLen>>2] |= 0x80 << (24 - (chunkLen % 4 << 3));
    // To support msgLen >= 2 GiB, use a float division when computing the
    // high 32-bits of the big-endian message length in bits.
    bin[(((chunkLen >> 2) + 2) & ~0x0f) + 14] = (msgLen / (1 << 29)) |0;
    bin[(((chunkLen >> 2) + 2) & ~0x0f) + 15] = msgLen << 3;
  };

  const getRawDigest = (heap, padMaxChunkLen) => {
    const io = new Int32Array(heap, padMaxChunkLen + 320, 5);
    const out = new Int32Array(5);
    const arr = new DataView(out.buffer);
    arr.setInt32(0, io[0], false);
    arr.setInt32(4, io[1], false);
    arr.setInt32(8, io[2], false);
    arr.setInt32(12, io[3], false);
    arr.setInt32(16, io[4], false);
    return out;
  };

  class Rusha {
    constructor(chunkSize) {
      chunkSize = chunkSize || 64 * 1024;
      if (chunkSize % 64 > 0) {
        throw new Error('Chunk size must be a multiple of 128 bit');
      }
      this._offset = 0;
      this._maxChunkLen = chunkSize;
      this._padMaxChunkLen = padlen(chunkSize);
      // The size of the heap is the sum of:
      // 1. The padded input message size
      // 2. The extended space the algorithm needs (320 byte)
      // 3. The 160 bit state the algoritm uses
      this._heap = new ArrayBuffer(ceilHeapSize$1(this._padMaxChunkLen + 320 + 20));
      this._h32 = new Int32Array(this._heap);
      this._h8 = new Int8Array(this._heap);
      this._core = new RushaCore$1({Int32Array: Int32Array}, {}, this._heap);
    }

    _initState(heap, padMsgLen) {
      this._offset = 0;
      const io = new Int32Array(heap, padMsgLen + 320, 5);
      io[0] = 1732584193;
      io[1] = -271733879;
      io[2] = -1732584194;
      io[3] = 271733878;
      io[4] = -1009589776;
    }

    _padChunk(chunkLen, msgLen) {
      const padChunkLen = padlen(chunkLen);
      const view = new Int32Array(this._heap, 0, padChunkLen >> 2);
      padZeroes(view, chunkLen);
      padData(view, chunkLen, msgLen);
      return padChunkLen;
    }

    _write(data, chunkOffset, chunkLen, off) {
      conv(data, this._h8, this._h32, chunkOffset, chunkLen, off || 0);
    }

    _coreCall(data, chunkOffset, chunkLen, msgLen, finalize) {
      let padChunkLen = chunkLen;
      this._write(data, chunkOffset, chunkLen);
      if (finalize) {
        padChunkLen = this._padChunk(chunkLen, msgLen);
      }
      this._core.hash(padChunkLen, this._padMaxChunkLen);
    }

    rawDigest(str) {
      const msgLen = str.byteLength || str.length || str.size || 0;
      this._initState(this._heap, this._padMaxChunkLen);
      let chunkOffset = 0, chunkLen = this._maxChunkLen;
      for (chunkOffset = 0; msgLen > chunkOffset + chunkLen; chunkOffset += chunkLen) {
        this._coreCall(str, chunkOffset, chunkLen, msgLen, false);
      }
      this._coreCall(str, chunkOffset, msgLen - chunkOffset, msgLen, true);
      return getRawDigest(this._heap, this._padMaxChunkLen);
    }

    digest(str) {
      return toHex$1(this.rawDigest(str).buffer);
    }
  }

  w.Rusha = Rusha;

})(this);
