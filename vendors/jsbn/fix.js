

function RSAEncryptLong(text) {
  var length = ((this.n.bitLength()+7)>>3) - 11;
  if (length <= 0) return false;
  var ret = "";
  var i = 0;
  while(i + length < text.length) {
    ret += this._short_encrypt(text.substring(i,i+length));
    i += length;
  }
  ret += this._short_encrypt(text.substring(i,text.length));
  return ret;
}

RSAKey.prototype._short_encrypt = RSAEncrypt;
RSAKey.prototype.encrypt = RSAEncryptLong;

window['RSAKey'] = RSAKey;
