const crypto = require('crypto')

let createSgnature = (message) => {
    const secret = "8gBm/:&EnhH.1/q"

    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(message)

    const hashInBase64 = hmac.digest("base64")

    return hashInBase64
    // console.log(hashInBase64);
}

const a = createSgnature(`total_amount=110,transaction_uuid=ab14a8f2b02c3tyh,product_code=EPAYTEST`)

console.log(a);

