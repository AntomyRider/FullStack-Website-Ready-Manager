const prisma = require("../lib/prisma.js");
const { StatusKey } = require("@prisma/client")

exports.verify = async (req, res) => {
  try {
    const { key, hwid } = req.body
    if (!key || !hwid) {
      return res.status(400).json({
        success: false,
        message: "Missing key or hwid"
      })
    }


    const licence = await prisma.licence.findUnique({
      where: { key },
      include: { hwids: true }
    })

    if (!licence) {
      return res.status(404).json({
        success: false,
        message: "Invalid licence"
      })
    }

    if (licence.status !== StatusKey.Enable) {
      return res.status(403).json({
        success: false,
        message: "Licence inactive"
      })
    }

    // ✅ เช็ค expireAt
    if (licence.expireAt && licence.expireAt < new Date()) {
      return res.status(403).json({
        success: false,
        message: "Licence expired"
      })
    }

    // ✅ เช็คว่า activate แล้วหรือยัง
    if (!licence.activatedAt) {
      return res.status(403).json({
        success: false,
        message: "Licence not activated"
      })
    }

    // ✅ เช็ค HWID mismatch
    const boundHwid = licence.hwids.find((item) => item.hwid === hwid)

    if (!boundHwid) {
      return res.status(403).json({
        success: false,
        message: "HWID not bound"
      })
    }

    return res.status(200).json({
      success: true,
      message: "Verified",
      data: {
        key: licence.key,
        hwid: boundHwid.hwid,
        status: licence.status
      }
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}
