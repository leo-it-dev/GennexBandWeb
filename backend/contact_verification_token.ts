import * as LRU from 'lru-cache';
import { MAX_TTL_MINUTES, VERIFICATION_CODE_ALPHABET, VERIFICATION_CODE_LENGTH } from '../api_common/verification';

const verificationCodeCache = new LRU.LRUCache({
    max: 1000,
    ttl: 1000 * 60 * MAX_TTL_MINUTES
})

export function generateContactEmailVerifyCode(email: string) {
    let verificationCode = "";
    for (let codeIdx = 0; codeIdx < VERIFICATION_CODE_LENGTH; codeIdx++) {
        verificationCode += VERIFICATION_CODE_ALPHABET.at(Math.floor(Math.random() * VERIFICATION_CODE_ALPHABET.length));
    }
    verificationCodeCache.set(email, verificationCode);
    return verificationCode;
}

export function validateContactEmailVerifyCode(email: string, code: string): boolean {
    if (!verificationCodeCache.has(email)) {
        return false;
    } 

    let success = (verificationCodeCache.get(email) as string).toLowerCase() == code.toLowerCase();
    if (success) {
        verificationCodeCache.delete(email);
    }
    return success;
}