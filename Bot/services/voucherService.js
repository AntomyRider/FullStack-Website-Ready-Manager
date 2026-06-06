const twVoucher = require("@fortune-inc/tw-voucher").default || require("@fortune-inc/tw-voucher");

function normalizePhone(input) {
  let digits = String(input).replace(/\D/g, "");
  if (digits.startsWith("66") && digits.length === 11) {
    digits = "0" + digits.slice(2);
  }
  if (!/^0\d{9}$/.test(digits)) {
    throw new Error("Phone number must be 10 digits starting with 0 (e.g., 0812345678)");
  }
  return digits;
}

function extractVoucherCode(input) {
  const s = String(input).trim();
  const m = s.match(/[?&]v=([A-Za-z0-9]+)/);
  return m ? m[1] : s;
}

async function redeemRaw(phoneRaw, voucherRaw) {
  try {
    const phone = normalizePhone(phoneRaw);
    const code = extractVoucherCode(voucherRaw);

    if (!code || code.length !== 35) {
      return {
        success: false,
        code: "INVALID_INPUT",
        message: "รหัสซองอั่งเปาต้องมีความยาว 35 ตัวอักษร"
      };
    }

    // เรียกใช้งาน twVoucher ผ่าน proxy เพื่อหลีกเลี่ยงการโดน Cloudflare บล็อก
    const result = await twVoucher(phone, code);
    
    const amountSatang = Math.round(result.amount * 100);

    return {
      success: true,
      code: "SUCCESS",
      amount: amountSatang,
      message: "Redeemed successfully"
    };

  } catch (e) {
    let friendlyMessage = "ระบบขัดข้องในการเคลมซองอั่งเปา";
    
    const errCode = e.message;
    if (errCode === "VOUCHER_NOT_FOUND" || errCode === "INVAILD_VOUCHER") {
      friendlyMessage = "ไม่พบซองอั่งเปานี้ หรือรหัสซองไม่ถูกต้อง";
    } else if (errCode === "VOUCHER_OUT_OF_STOCK") {
      friendlyMessage = "ซองอั่งเปานี้ถูกใช้งานไปแล้ว หรือหมดอายุแล้ว";
    } else if (errCode === "TARGET_USER_NOT_FOUND" || errCode === "INVAILD_PHONE") {
      friendlyMessage = "เบอร์โทรศัพท์ปลายทางไม่ถูกต้อง";
    } else {
      friendlyMessage = `${errCode}`;
    }

    return {
      success: false,
      code: errCode,
      message: friendlyMessage
    };
  }
}

module.exports = { redeemRaw };
