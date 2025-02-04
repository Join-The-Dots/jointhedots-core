import SHA256 from 'crypto-js/sha256.js'
import base64url from 'crypto-js/enc-base64url.js'
import { encode_base64url } from "@livedoc/core/common/base64url"

export function ComputeResourceHashID(norm: string, identity: string, namespace?: string): string {
    const hash = SHA256((namespace || "") + '\0' + norm + '\0' + identity)
    return hash.toString(base64url)
 }
 
 export function ComputeResourceXRID(norm: string, identity: string) {
    return norm + "/" + encode_base64url(identity)
 }
 