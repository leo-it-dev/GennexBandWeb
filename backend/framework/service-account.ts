import * as config from 'config';
import * as jwt from 'jsonwebtoken';
import { getLogger } from '../logger';

let currentServiceAccount: ServiceAccountAccess | undefined = undefined;
let SERVICE_ACCOUNT_TIMEOUT_SECONDS_BEFORE_EXPIRATION = 60;
let logger = getLogger("google-service-account-manager");

export type ServiceAccountAccess = {
    accessToken: string,
    expires: number,
    tokenType: string
}

const AUTH_DATA = {
    PRIVATE_KEY: config.get("google-service-account.PRIVATE_KEY") as string,
    USER_EMAIL: config.get("google-service-account.CLIENT_EMAIL") as string
}

async function authenticateServiceAccount(): Promise<ServiceAccountAccess> {
    return new Promise<ServiceAccountAccess>((res, rej) => {
        let jwtBody = {
            "iss": AUTH_DATA.USER_EMAIL,
            "scope": "https://www.googleapis.com/auth/calendar",
            "aud": "https://oauth2.googleapis.com/token",
            "exp": Math.round(new Date().getTime() / 1000 + 60 * 30),
            "iat": Math.round(new Date().getTime() / 1000)
        }

        let jwtToken = jwt.sign(jwtBody, AUTH_DATA.PRIVATE_KEY, {
            algorithm: 'RS256',
        });

        fetch("https://oauth2.googleapis.com/token", {
            method: 'POST',
            body: new URLSearchParams({
                'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion': jwtToken
            })
        }).then(dat => dat.json()).then(dat => {
            if ('access_token' in dat && 'expires_in' in dat && 'token_type' in dat) {
                res({
                    accessToken: dat['access_token'],
                    expires: Math.round(new Date().getTime()/1000) + dat['expires_in'],
                    tokenType: dat['token_type']
                })
            } else {
                throw Error("Invalid response structure: " + JSON.stringify(dat));
            }
        }).catch(err => {
            rej(err);
        })
    });
}

export async function getAuthenticatedServiceAccount() {
    if (currentServiceAccount == undefined || currentServiceAccount.expires <= (Math.round(new Date().getTime()/1000) - SERVICE_ACCOUNT_TIMEOUT_SECONDS_BEFORE_EXPIRATION)) {
        try {
            currentServiceAccount = await authenticateServiceAccount();
            logger.info("Successfully authorized a new google service account access_token!", {expires: currentServiceAccount.expires});
        } catch(e) {
            logger.error("Error authorizing google service account!", {error: e});
        }
    }
    return currentServiceAccount;
}
