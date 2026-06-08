const axios = require('axios')

async function verifySlip(payload) {
    try {
        const apiKey = process.env.EASYSLIP_API_KEY;
        console.log('[BankService] Verification request. API Key being used:', apiKey ? `${apiKey.slice(0, 5)}...${apiKey.slice(-5)}` : 'undefined (not loaded)');
        const res = await axios.post('https://api.easyslip.com/v2/verify/bank', { payload }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        })
        return res.data
    } catch (err) {

        if (err.response?.data) {
            console.error('[BankService] EasySlip rejected:', err.response.data)
            return err.response.data
        }
        // network error / timeout
        console.error('[BankService] Network error:', err.message)
        return { status: 503, message: err.message }
    }
}

module.exports = { verifySlip }