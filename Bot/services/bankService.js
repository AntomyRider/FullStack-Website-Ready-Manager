const axios = require('axios')

async function verifySlip(payload) {
    try {
        const res = await axios.post('https://api.easyslip.com/v2/verify/bank', { payload }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.EASYSLIP_API_KEY}`
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