export function decode_base64url(data: string): string {
   data = data.replace(/-/g, '+').replace(/_/g, '/');
   const pad = data.length % 4;
   if (pad > 0) {
      if (pad === 1) {
         throw new Error('base64url string has invalid length');
      }
      data += new Array(5 - pad).join('=');
   }
   return atob(data);
}

export function encode_base64url(data: string): string {
   return btoa(data).replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
}
