import axios from "axios";

const authApi = axios.create({
    baseURL: "/api/auth",
    withCredentials: true
})

export const login = async (form) => {
    try {
        const res = await authApi.post("/login", form)
        return res.data
    } catch (error) {
        console.error(error)
        return {
            success: false,
            message: error.response?.data?.message || error.message,
        }
    }
}

export const me = async () => {
    try {
        const res = await authApi.get("/me")
        return res.data
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || error.message,
        }
    }
}
