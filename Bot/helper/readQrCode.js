const sharp = require("sharp");
const jsQR = require("jsqr");
const axios = require("axios");

/**
 * อ่าน QR Code จาก URL รูปภาพ
 * - ใช้ axios download buffer (รองรับ Discord CDN)
 * - ใช้ sharp แทน Jimp (stable API ทุก version)
 * - retry หลาย scale จนกว่าจะ decode ได้
 * @param {string} imageUrl
 * @returns {Promise<string|null>}
 */
async function readQrCode(imageUrl) {
    try {
        // ── 1. Download image as buffer ───────────────────────────────────
        const response = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            headers: { "User-Agent": "Mozilla/5.0 (compatible; DiscordBot)" },
            timeout: 15_000,
        });

        const buffer = Buffer.from(response.data);

        // ── 2. อ่าน metadata ครั้งเดียว ───────────────────────────────────
        const { width: origWidth, height: origHeight } = await sharp(buffer).metadata();

        // ── 3. Retry หลาย scale ───────────────────────────────────────────
        for (const scale of [1, 2, 3]) {
            const { data, info } = await sharp(buffer)
                .resize(origWidth * scale, origHeight * scale, {
                    kernel: sharp.kernel.nearest, // pixel-perfect upscale ไม่ blur
                })
                .ensureAlpha()   // ให้แน่ใจว่าเป็น RGBA (4 bytes/pixel) ที่ jsQR ต้องการ
                .raw()
                .toBuffer({ resolveWithObject: true });

            const result = jsQR(
                new Uint8ClampedArray(data),
                info.width,
                info.height,
                { inversionAttempts: "attemptBoth" } // รองรับ QR ทั้ง dark-on-light และ light-on-dark
            );

            if (result?.data) {
                console.log(`[QR] ✅ Decoded at scale ${scale}x`);
                return result.data;
            }

            console.log(`[QR] ❌ Scale ${scale}x — no QR found`);
        }

        console.warn("[QR] All scales failed:", imageUrl);
        return null;

    } catch (err) {
        console.error("[QR] Error:", err.message);
        return null;
    }
}

module.exports = { readQrCode };