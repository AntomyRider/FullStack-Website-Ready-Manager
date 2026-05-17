import axios from "axios";

const licenseApi = axios.create({
    baseURL: "/api/licences",
    withCredentials: true
})

export const listKey = async () => {
    try {
        const res = await licenseApi.get("/list")
        return res
    } catch (error) {
        console.log(error)
        return {
            success: false,
            message: error.message,
        }
    }
}

export const createKey = async (form) => {
    try {
        const res = await licenseApi.post("/create", form)
        return res.data
    } catch (error) {
        console.log(error)
        return {
            success: false,
            message: error.message,
        }
    }
}

export const deleteKey = async (id) => {
    try {
        const res = await licenseApi.delete(`/delete/${id}`)
        return res.data
    } catch (error) {
        console.log(error)

        return {
            success: false,
            message: error.message,
        }
    }
}

export const resetKey = async (key) => {
    try {
        const res = await licenseApi.post("/resetkey", { key })
        return res.data
    } catch (error) {
        console.log(error)

        return {
            success: false,
            message: error.message,
        }
    }
}

export const updateKey = async (id, status) => {
    try {
        const res = await licenseApi.post(`/update/${id}`, { status })
        return res.data
    } catch (error) {
        console.error(error)
    }
}
