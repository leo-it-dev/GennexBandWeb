import * as config from 'config';

export enum CaptchaVerificationResult {
    SUCCESS,
    CAPTCHA_INVALID,
    CAPTCHA_COMMUNICATION_ERROR
}

export async function verifyCaptcha(captchaToken: string): Promise < CaptchaVerificationResult > {
    return new Promise<CaptchaVerificationResult>((res, _) => {
        const params = new URLSearchParams();
        params.append('secret', config.get("generic.HCAPTCHA_SECRET"));
        params.append('response', captchaToken);

        fetch("https://hcaptcha.com/siteverify", {
            method: "POST",
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(async dat => {
            let json = await dat.json();

            if (!dat.ok) {
                console.error("Error communicating with hcaptcha page!: " + dat.status + ":" + json);
                res(CaptchaVerificationResult.CAPTCHA_COMMUNICATION_ERROR);
                return;
            }

            if (json.success) { // HCaptcha verify successfull
                res(CaptchaVerificationResult.SUCCESS);
                return;
            } else {
                res(CaptchaVerificationResult.CAPTCHA_INVALID);
                return;
            }
        }).catch(err => {
            console.log(err);
            res(CaptchaVerificationResult.CAPTCHA_COMMUNICATION_ERROR);
            return;
        })
    });
}
